import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
const require = createRequire(import.meta.url);
export const root = path.resolve(import.meta.dirname, '../..');
export function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} }; cache.set(file, module.exports);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    function resolve(name) {
      if (name in overrides) return overrides[name];
      if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name.startsWith('@/') || name.startsWith('.')) { const target=name.startsWith('@/') ? path.join(root,name.slice(2)) : path.resolve(path.dirname(file),name); return load(target.endsWith('.ts')?target:target+'.ts'); }
      return require(name);
    }
    new Function('require', 'module', 'exports', source)(resolve, module, module.exports);
    cache.set(file, module.exports); return module.exports;
  }
  return relative => load(path.join(root, relative));
}
export async function withEnv(values, action) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try { for (const [key,value] of Object.entries(values)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } return await action(); }
  finally { for (const [key,value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
}
