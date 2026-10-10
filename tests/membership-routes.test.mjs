import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');

function fixture({ plan = 'free', invalid = false, outage = false } = {}) {
  const calls = [], cache = new Map();
  const admin = {
    auth: { getUser: async token => { if (outage) throw Error('auth outage'); return { data: { user: invalid ? null : { id: 'verified-owner' } }, error: invalid ? { status: 401 } : null }; } },
    from: table => { assert.equal(table, 'smartcart_profiles'); return { select: columns => { assert.equal(columns, 'plan'); return { eq: (column, id) => { assert.equal(column, 'id'); assert.equal(id, 'verified-owner'); return { maybeSingle: async () => ({ data: { plan }, error: null }) }; } }; } }; },
  };
  class OpenAI { chat = { completions: { create: async options => { calls.push(options); throw Error('provider intercepted before billing'); } } }; }
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} }; cache.set(file, module.exports);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    function resolve(name) {
      if (name === 'openai') return OpenAI;
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name.endsWith('supabase-admin')) return { getSupabaseAdminClient: () => admin };
      if (name.startsWith('@/') || name.startsWith('.')) return load((name.startsWith('@/') ? path.join(root,name.slice(2)) : path.resolve(path.dirname(file),name)) + '.ts');
      return require(name);
    }
    new Function('require','module','exports',source)(resolve,module,module.exports);
    cache.set(file,module.exports); return module.exports;
  }
  return { calls, load };
}
const input={ budget:150,diet:'No preference',householdSize:2,combinedPantryItems:'',rejectedMealTitle:'Previous meal',generationQuality:'plus',replacementQuality:'plus',userId:'someone-else',cuisinePreference:'SecretCuisineMarker' };
for (const endpoint of ['replace-meal']) {
  test(`${endpoint}: body spoofing cannot upgrade guest/Free, verified Plus uses Plus model`, async () => {
    const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='local-mock-only';
    try {
      for (const [token,plan,expected] of [[undefined,'plus','gpt-4.1'],['valid','free','gpt-4.1'],['valid','plus','gpt-6.1-sol']]) {
        const f=fixture({plan}); const { POST }=f.load(path.join(root,'app/api',endpoint,'route.ts'));
        const response=await POST(new Request('http://local.test',{method:'POST',headers:{'Content-Type':'application/json',...(token ? {Authorization:`Bearer ${token}`} : {})},body:JSON.stringify(input)}));
        assert.equal(response.status,500);assert.equal(f.calls[0].model,expected);
        if (plan === 'plus' && token) {
          assert.equal(f.calls[0].reasoning_effort, 'low');
          assert.equal('temperature' in f.calls[0], false);
        } else {
          assert.equal(f.calls[0].temperature, endpoint === 'generate-list' ? 0.4 : 0.7);
          assert.equal('reasoning_effort' in f.calls[0], false);
        }
        assert.equal(JSON.stringify(f.calls[0].messages).includes('SecretCuisineMarker'),expected==='gpt-6.1-sol');
      }
    } finally { if(previous===undefined) delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous; }
  });
  test(`${endpoint}: forged credentials and auth outages never call AI`, async () => {
    const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='local-mock-only';
    try {
      for(const [options,status] of [[{invalid:true},401],[{outage:true},503]]) {
        const f=fixture(options);const {POST}=f.load(path.join(root,'app/api',endpoint,'route.ts'));
        const response=await POST(new Request('http://local.test',{method:'POST',headers:{Authorization:'Bearer forged','Content-Type':'application/json'},body:JSON.stringify(input)}));
        assert.equal(response.status,status);assert.equal(f.calls.length,0);
      }
    } finally { if(previous===undefined) delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous; }
  });
}

test('saved-job generation engine retains Free/Sol routing and compatible settings', async () => {
  const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='local-mock-only';
  try {
    for (const plan of ['free','plus']) {
      const f=fixture({plan});const {generateMealPlan}=f.load(path.join(root,'lib/meal-generation.ts'));
      const response=await generateMealPlan(input,plan);
      assert.equal(response.status,500);
      assert.equal(f.calls[0].model,plan==='plus'?'gpt-6.1-sol':'gpt-4.1');
      assert.equal(JSON.stringify(f.calls[0].messages).includes('SecretCuisineMarker'),plan==='plus');
      if(plan==='plus') { assert.equal(f.calls[0].reasoning_effort,'low');assert.equal('temperature' in f.calls[0],false); }
      else assert.equal(f.calls[0].temperature,0.4);
    }
  } finally { if(previous===undefined) delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous; }
});
