// Isolated, owner-approved evaluation only. Never imports application env files or touches Supabase.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import ts from 'typescript';import OpenAI from 'openai';
import {cases,rubric} from '../evals/recipe-quality-cases.mjs';
const require=createRequire(import.meta.url),baseline='9fc354f17645d2e3aea44123f74960fbda3ab81a';
const output=process.env.MEALCADDIE_EVAL_OUTPUT;if(!output)throw Error('Set MEALCADDIE_EVAL_OUTPUT to a private local result path.');
if(process.env.MEALCADDIE_EVAL_APPROVED_USD!=='15')throw Error('Explicit evaluation approval ceiling required.');
if(!process.env.OPENAI_API_KEY)throw Error('Provide OPENAI_API_KEY privately; no other credential is needed.');
const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:90000});
const state=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):{baseline,startedAt:new Date().toISOString(),ceilingUSD:15,spentUSD:0,calls:0,rubric,results:[]};
const save=()=>fs.writeFileSync(output,JSON.stringify(state,null,2));
const replay=process.env.MEALCADDIE_EVAL_REPLAY_FINAL === "true";
const sourceFiles=fs.readdirSync("lib").filter(f=>f.endsWith(".ts")).map(f=>"lib/"+f);
const sourceSnapshot=new Map(sourceFiles.map(f=>[f,fs.readFileSync(f,"utf8")]));
const sourceHash=createHash("sha256").update([...sourceSnapshot.values()].join("\n")).digest("hex");
function loadHandler(ref,providerRecords,seeds=[]) {
 let cursor=0;
 const evaluationProcess={...process,env:{...process.env,MEALCADDIE_DIETARY_CANDIDATE:ref?"false":"true",VERCEL_ENV:"preview"}};
 const cache=new Map();
 class Provider {chat={completions:{create:async(args,options)=>{
   if(cursor<seeds.length){const seed=seeds[cursor++];providerRecords.push(seed);if(seed.error)throw Error("Recorded provider error; no automatic paid retry.");return {model:seed.model,usage:seed.usage,choices:[{message:{content:seed.content}}]};}
   if(process.env.MEALCADDIE_EVAL_OFFLINE_REPLAY === "true")throw Error("Offline replay has no further recorded response; no network call made.");
   if(providerRecords.length>=3)throw Error("Original three-call menu budget exhausted; no extra paid request.");
   const inputCeiling=Buffer.byteLength(JSON.stringify(args.messages));
   const price=args.model==='gpt-4.1'?8:10;
   const ceiling=inputCeiling*2/1e6+6000*price/1e6;
   if(state.spentUSD+ceiling>15)throw Error('Evaluation budget exhausted; no further provider call made.');
   state.spentUSD+=ceiling;state.calls++;save();
   try {const r=await client.chat.completions.create({...args,max_completion_tokens:6000},{...options,timeout:90000});
    const actual=((r.usage?.prompt_tokens||inputCeiling)*2+(r.usage?.completion_tokens||6000)*price)/1e6;
    state.spentUSD=state.spentUSD-ceiling+actual;providerRecords.push({model:r.model,usage:r.usage,content:r.choices[0]?.message?.content});save();return r;
   }catch(e){providerRecords.push({error:e.status||'transport-error',reservedCeilingUSD:ceiling});throw e;}
 }}};}
 function load(file){if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);
   const source=ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):sourceSnapshot.get(file) ?? fs.readFileSync(file,'utf8');
   const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
   new Function('require','module','exports','process',code)(name=>name==='openai'?Provider:name.endsWith('beta-pilot-ai')?{pilotAIBudget:async()=>null}:name==='next/server'?{NextResponse:{json:(b,o)=>Response.json(b,o)}}:name.startsWith('@/')||name.startsWith('.')?load((name.startsWith('@/')?name.slice(2):path.posix.normalize(path.posix.join(path.posix.dirname(file),name)))+'.ts'):require(name),module,module.exports,evaluationProcess);return module.exports;
 }
 return load('lib/meal-generation.ts').generateMealPlan;
}
const tasks=cases.flatMap(testCase=>['free','plus'].flatMap(tier=>['before','after'].map(variant=>({testCase,tier,variant}))));
let taskIndex=0;
async function worker(){while(taskIndex<tasks.length){const {testCase,tier,variant}=tasks[taskIndex++];
 const key=[testCase.id,tier,variant].join('/');
 if(replay && variant==='before')continue;
 const target=replay?(state.finalReplays||=[]):state.results;
 if(target.some(r=>r.key===key))continue;
 const seeds=replay?(state.finalSeedRecords?.[key] || state.results.find(r=>r.key===key)?.providerRecords||[]):[];
 const records=[];process.env.MEALCADDIE_DIETARY_CANDIDATE=variant==='after'?'true':'false';process.env.VERCEL_ENV='preview';
 const started=Date.now();try{const fn=loadHandler(variant==='before'?baseline:null,records,seeds),r=await fn(testCase.input,tier);target.push({key,sourceHash,replayed:replay,input:testCase.input,status:r.status,result:await r.json(),providerRecords:records,elapsedMs:Date.now()-started});}
 catch(e){target.push({key,sourceHash,replayed:replay,status:'evaluation-error',error:e.message,providerRecords:records});}
 save();console.log(JSON.stringify({key,status:target.at(-1).status,calls:state.calls,spentUSD:Number(state.spentUSD.toFixed(4))}));
}
}
await Promise.all([worker(),worker(),worker()]);
state.finishedAt=new Date().toISOString();save();
