// Local verification only. This module never contacts a provider by itself.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const providerLimits=Object.freeze({planning:3,recipe:2,total:5,inputBytes:32768,planningOutput:4096,recipeOutput:3500,responseBytes:2000000});
export const providerModels=Object.freeze({'gpt-4.1':'planning','gpt-6-luna':'recipe'});
export class BudgetError extends Error {constructor(code){super(code);this.code=code;}}
export function openAttemptBudget(directory){
 const filename=path.join(directory,'attempts.json'),lock=path.join(directory,'attempts.lock');
 function read(){
  const data=JSON.parse(fs.readFileSync(filename,'utf8'));
  if(data.version!==1||!Array.isArray(data.attempts)||!['prepared','armed','closed'].includes(data.state))throw new BudgetError('LEDGER_INVALID');
  if(data.limits&&Object.keys(providerLimits).some(k=>data.limits[k]!==providerLimits[k]))throw new BudgetError('LEDGER_LIMITS_MISMATCH');
  for(const [index,a] of data.attempts.entries())if(a.ordinal!==index+1||!['planning','recipe'].includes(a.kind)||!['dispatching','completed','failed','uncertain'].includes(a.state))throw new BudgetError('LEDGER_INVALID');
  if(data.attempts.length>5||data.attempts.filter(a=>a.kind==='planning').length>3||data.attempts.filter(a=>a.kind==='recipe').length>2)throw new BudgetError('LEDGER_INVALID');
  return data;
 }
 function change(action){
  let fd;try{fd=fs.openSync(lock,'wx');const data=read(),answer=action(data);const temp=filename+'.next';fs.writeFileSync(temp,JSON.stringify(data,null,2),{flag:'wx'});fs.renameSync(temp,filename);return answer;}
  finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
 }
 return {
  read,
  arm(){return change(d=>{if(d.state!=='prepared'||d.attempts.length)throw new BudgetError('NOT_FRESH');d.state='armed';});},
  close(){return change(d=>{d.state='closed';});},
  bindJob(id,inputHash){return change(d=>{if(d.jobId&&d.jobId!==id)throw new BudgetError('SECOND_JOB_DENIED');if(d.inputHash&&d.inputHash!==inputHash)throw new BudgetError('INPUT_CHANGED');d.jobId=id;d.inputHash=inputHash;});},
  bindRecipe(key){return change(d=>{if(d.recipeHash&&d.recipeHash!==key)throw new BudgetError('SECOND_RECIPE_DENIED');d.recipeHash=key;});},
  reserve(kind,model,inputBytes,inputHash){return change(d=>{
   if(d.state!=='armed')throw new BudgetError('NOT_ARMED');
   if(d.attempts.some(a=>a.state==='uncertain'||a.state==='dispatching'))throw new BudgetError('UNCERTAIN_OR_ACTIVE_ATTEMPT');
   if(d.attempts.length>=providerLimits.total||d.attempts.filter(a=>a.kind===kind).length>=providerLimits[kind])throw new BudgetError('ATTEMPT_LIMIT');
   const ordinal=d.attempts.length+1;d.attempts.push({ordinal,kind,model,inputBytes,inputHash,state:'dispatching',startedAt:new Date().toISOString()});return ordinal;
  });},
  finish(ordinal,summary){return change(d=>{const a=d.attempts[ordinal-1];if(!a||a.state!=='dispatching')throw new BudgetError('ATTEMPT_STATE');Object.assign(a,summary,{finishedAt:new Date().toISOString()});});},
 };
}
export function prepareProviderRequest(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new BudgetError('REQUEST_SHAPE');
 const kind=providerModels[body.model];if(!kind)throw new BudgetError('MODEL_NOT_ALLOWED');
 if(!Array.isArray(body.messages)||!body.messages.length||body.messages.length>8||body.messages.some(m=>!m||!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'||Object.keys(m).some(k=>!['role','content'].includes(k))))throw new BudgetError('MESSAGE_SHAPE');
 // Pass through only fields used by the reviewed application; no tools, images,
 // streaming, n>1, provider-routing options or arbitrary endpoint access.
 if(Object.keys(body).some(k=>!['model','messages','response_format','temperature','reasoning_effort','max_completion_tokens','max_tokens','stream'].includes(k))||body.stream===true)throw new BudgetError('REQUEST_OPTIONS');
 if(body.response_format?.type!=='json_object'||Object.keys(body.response_format).length!==1)throw new BudgetError('RESPONSE_FORMAT');
 const inputBytes=Buffer.byteLength(JSON.stringify(body.messages),'utf8');
 if(inputBytes>providerLimits.inputBytes)throw new BudgetError('INPUT_BYTE_LIMIT');
 const outputLimit=kind==='planning'?providerLimits.planningOutput:providerLimits.recipeOutput;
 const supplied=body.max_completion_tokens??body.max_tokens??outputLimit;
 if(!Number.isInteger(supplied)||supplied<=0)throw new BudgetError('OUTPUT_LIMIT');
 const request={model:body.model,messages:body.messages,response_format:{type:'json_object'},service_tier:'default',max_completion_tokens:Math.min(outputLimit,supplied),...(kind==='planning'?{temperature:0.4}:{reasoning_effort:'low'})};
 return {kind,request,inputBytes,inputHash:createHash('sha256').update(JSON.stringify(body.messages)).digest('hex')};
}
export function createBoundedProvider({budget,transport,authorize=async()=>{}}){
 if(typeof transport!=='function')throw new BudgetError('TRANSPORT_REQUIRED');
 return async function handle(body){
  const prepared=prepareProviderRequest(body);await authorize(prepared);
  const ordinal=budget.reserve(prepared.kind,prepared.request.model,prepared.inputBytes,prepared.inputHash);
  try{
   const response=await transport(prepared.request);
   const requestId=response.headers.get('x-request-id');
   const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>providerLimits.responseBytes)throw new BudgetError('RESPONSE_TOO_LARGE');
   let parsed;try{parsed=JSON.parse(bytes.toString('utf8'));}catch{throw new BudgetError('RESPONSE_INVALID');}
   const usage=parsed.usage;const safeUsage=usage&&['prompt_tokens','completion_tokens','total_tokens'].every(k=>Number.isSafeInteger(usage[k])&&usage[k]>=0)?Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens'].map(k=>[k,usage[k]])):undefined;
   if(parsed.service_tier&&parsed.service_tier!=='default')throw new BudgetError('NONSTANDARD_BILLING_TIER');
   const tokensValid=!safeUsage||(safeUsage.completion_tokens<=prepared.request.max_completion_tokens&&safeUsage.prompt_tokens<=(prepared.kind==='planning'?1047576:1050000));
   if(!tokensValid)throw new BudgetError('USAGE_LIMIT_DISCREPANCY');
   const code=parsed.error?.code;const errorCategory=['invalid_api_key','insufficient_quota','model_not_found','rate_limit_exceeded','context_length_exceeded','unsupported_parameter','invalid_value'].includes(code)?code:'PROVIDER_HTTP_REJECTION';
   budget.finish(ordinal,{state:response.ok?'completed':response.status===408||response.status>=500?'uncertain':'failed',httpStatus:response.status,...(!response.ok?{category:errorCategory}:{}),...(requestId&&/^[A-Za-z0-9_-]{1,180}$/.test(requestId)?{providerRequestId:requestId}:{}),...(safeUsage?{usage:safeUsage}:{})});
   // Never forward raw provider errors to application logs/UI.
   if(!response.ok)return {status:response.status===408||response.status>=500?502:response.status,body:{error:{message:'Bounded provider request failed.',code:response.status===429?'rate_limit_exceeded':'BOUNDED_PROVIDER_REJECTION'}}};
   return {status:200,body:parsed};
  }catch(error){
   budget.finish(ordinal,{state:'uncertain',category:error instanceof BudgetError?error.code:'TRANSPORT_OR_RESPONSE_UNCERTAIN'});
   throw new BudgetError('UNCERTAIN_PROVIDER_OUTCOME');
  }
 };
}
