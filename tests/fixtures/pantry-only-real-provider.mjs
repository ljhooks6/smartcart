// Owner-operated local lab. 'prepare' cannot perform network/provider work.
// 'serve' requires separate explicit owner authorization and a private TTY key.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {spawn} from 'node:child_process';
import {startPantryLab} from './pantry-only-server.mjs';
import {openAttemptBudget,createBoundedProvider,providerLimits} from '../helpers/provider-attempt-budget.mjs';
import {authorizeLocalJob,measuredFixture} from '../helpers/local-real-provider-scope.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=path.join(process.env.USERPROFILE||'', 'Documents','Codex','assignment02d-runs');
function ordinary(directory){if(!path.resolve(directory).startsWith(path.resolve(base)+path.sep)||fs.lstatSync(directory).isSymbolicLink()||fs.realpathSync(directory)!==path.resolve(directory))throw Error('RUN_DIRECTORY_INVALID');}
async function hiddenKey(){
 if(!process.stdin.isTTY||!process.stdout.isTTY||!process.stdin.setRawMode)throw Error('PRIVATE_TTY_REQUIRED');
 process.stdout.write('Dedicated TESTING API key (hidden; never paste into chat): ');
 return new Promise((resolve,reject)=>{let value='';process.stdin.setRawMode(true);process.stdin.resume();
  function finish(error){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');if(error)reject(Error(error));else resolve(value);value='';}
  function onData(bytes){for(const c of bytes.toString('utf8')){if(c==='\u0003')return finish('OWNER_CANCELLED');if(c==='\r'||c==='\n')return finish();if(c==='\u007f'||c==='\b')value=value.slice(0,-1);else if(c.charCodeAt(0)>=32)value+=c;if(value.length>500)return finish('KEY_INPUT_INVALID');}}
  process.stdin.on('data',onData);
 });
}
async function main(){
 if(process.argv[2]==='prepare'){
  const directory=path.join(base,new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));fs.mkdirSync(directory,{recursive:true});ordinary(directory);
  fs.writeFileSync(path.join(directory,'attempts.json'),JSON.stringify({version:1,state:'prepared',runId:path.basename(directory),syntheticDataOnly:true,limits:providerLimits,attempts:[]},null,2),{flag:'wx'});
  console.log('PREPARED; zero provider calls. Run directory: '+directory);return;
 }
 if(process.argv[2]!=='serve'||!process.argv[3])throw Error('USAGE_PREPARE_OR_SERVE_RUN_DIRECTORY');
 if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||process.env.NODE_OPTIONS)throw Error('UNREVIEWED_TLS_OR_PRELOAD_OPTIONS');
 const directory=path.resolve(process.argv[3]);ordinary(directory);const budget=openAttemptBudget(directory);if(budget.read().state!=='prepared')throw Error('ONE_SHOT_RUN_ALREADY_STARTED');
 for(const name of ['.env','.env.local','.env.development','.env.development.local'])if(fs.existsSync(path.join(root,name)))throw Error('HOSTED_ENV_FILE_PRESENT');
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('PRIVATE_TTY_REQUIRED');
 const prompt=createInterface({input:process.stdin,output:process.stdout});const answer=await prompt.question('Only AFTER explicit chat approval: type APPROVED-LOCAL-FIVE-ATTEMPTS: ');prompt.close();
 if(answer!=='APPROVED-LOCAL-FIVE-ATTEMPTS')throw Error('OWNER_ACKNOWLEDGEMENT_REQUIRED');
 let key=await hiddenKey();if(!/^sk-[A-Za-z0-9_-]{20,}$/.test(key))throw Error('TEST_KEY_FORMAT_INVALID');
 budget.arm();let lab,child;let stopping=false;
 async function stop(){if(stopping)return;stopping=true;child?.kill();if(lab)await lab.close();budget.close();key='';console.log('STOPPED: disposable services closed; sanitized receipts retained. No secret file was written.');}
 const transport=request=>fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(request),redirect:'error',signal:AbortSignal.timeout(40000)});
 const bounded=createBoundedProvider({budget,transport,authorize:prepared=>authorizeLocalJob({budget,lab:lab.lab,prepared})});
 try{
  lab=await startPantryLab({pantry:measuredFixture,receiptPath:path.join(directory,'journey.json'),installSignalHandlers:false,providerHandler:body=>bounded(body),providerSummary:()=>{const d=budget.read();return {providerReservations:d.attempts.length,completedResponses:d.attempts.filter(a=>a.state==='completed').length,failedResponses:d.attempts.filter(a=>a.state==='failed').length,uncertainAttempts:d.attempts.filter(a=>a.state==='uncertain'||a.state==='dispatching').length};}});
  const env={};for(const k of ['PATH','Path','SystemRoot','WINDIR','COMSPEC','PATHEXT','USERPROFILE','LOCALAPPDATA','APPDATA','TEMP','TMP'])if(process.env[k])env[k]=process.env[k];
  Object.assign(env,{NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3053',NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-test-anon-only',SUPABASE_SERVICE_ROLE_KEY:'local-test-service-only',NEXT_PUBLIC_APP_URL:'http://localhost:3052',OPENAI_API_KEY:'local-broker-not-provider-key',OPENAI_BASE_URL:'http://127.0.0.1:3053/openai/v1',BETA_PRODUCT_ACCESS_ENABLED:'true',BETA_ENTITLEMENTS_ENABLED:'false',NEXT_TEST_WASM_DIR:'.\\node_modules\\@next\\swc-wasm-nodejs'});
  child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','-H','127.0.0.1','-p','3052'],{cwd:root,env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  // Avoid forwarding exception dumps or requests to terminal logs. Readiness is
  // available from the browser; emit only the standard local Next Ready line.
  for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{if(/Ready in/.test(b.toString()))console.log('Next Ready. Open http://127.0.0.1:3053/fixture, choose Free.');});
  child.once('error',()=>void stop());child.once('exit',()=>void stop());
  process.once('SIGINT',()=>void stop());process.once('SIGTERM',()=>void stop());
 }catch{await stop();throw Error('LOCAL_SERVICE_START_FAILED');}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error('STOP: '+(/^[A-Z0-9_]+$/.test(error.message)?error.message:'LOCAL_PREFLIGHT_FAILED')+'. No automatic retry.');process.exitCode=1;});
