// Executable local browser lab. Synthetic identities/data only; no upstream calls.
// Start from the repo root with Node 22. The app must use localhost:3052 and
// NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3053. No hosted credentials belong here.
import http from 'node:http';
import crypto from 'node:crypto';
import {writeFile,readFile} from 'node:fs/promises';
import {generationPostgresLab} from '../helpers/generation-postgres-lab.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export function fixtureOriginAllowed(origin,pathname,offlineSix){
 return !origin||origin==='http://localhost:3052'||(offlineSix&&pathname==='/fixture/expire-plus'&&origin==='http://127.0.0.1:3053');
}
export function offlinePantryResult(body,six){
 let data;try{data=JSON.parse(body.messages.find(m=>m.role==='user').content);}catch{/* Planning prompts are plain text, for both Free and Plus models. */}
 if(Array.isArray(data?.ingredients)&&typeof data.maximumMinutes==='number'){
  const ids=data.ingredients.map((_,i)=>i),minutes=data.ingredients.some(i=>/dry brown rice/i.test(i.name))?40:30;
  return {prep_time_minutes:minutes+10,actions:[{action:'mix',ingredientIds:ids,minutes:5},{action:'simmer',ingredientIds:ids,minutes},{action:'serve',ingredientIds:ids,minutes:5}]};
 }
 const names={'Rice':'Dry white rice','Black beans':'Cooked black beans','Chickpeas':'Cooked chickpeas'};
 return {...six,meals:six.meals.map(m=>({...m,ingredients:m.ingredients.map(i=>({...i,name:names[i.name]??i.name}))}))};
}
export async function startPantryLab({providerHandler,providerSummary,pantry,receiptPath=process.env.MEALCADDIE_JOURNEY_RECEIPT,installSignalHandlers=true}={}){
const offlineSix=process.env.MEALCADDIE_OFFLINE_SIX_REPLAY==='1'&&!providerHandler;
const six=offlineSix?JSON.parse(await readFile(new URL('./pantry-six-dinners.json',import.meta.url),'utf8')):null;
const lab=await generationPostgresLab(),app='http://localhost:3052',state=new Map();
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
for(const p of lab.people){
 const head=enc({alg:'HS256',typ:'JWT'}),body=enc({sub:p.id,aud:'authenticated',role:'authenticated',email:p.email,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+7200});
 p.token=head+'.'+body+'.'+crypto.createHmac('sha256','synthetic-local-only').update(head+'.'+body).digest('base64url');
 p.user={id:p.id,email:p.email,email_confirmed_at:p.email_confirmed_at,confirmed_at:p.email_confirmed_at,is_anonymous:false,role:'authenticated',aud:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{preferred_name:'Assignment 02 '+p.key,mealcaddie_setup_complete:true}};
 state.set(p.id,{week:[],vault:[],pantry:(pantry||[['Rice',3,'cup'],['Canned chickpeas',3,'cup'],['Scallions',4,'each'],['Water',6,'cup'],['Olive oil',6,'tsp'],['Milk',null,null]]).map(([ingredient_name,quantity,quantity_unit],i)=>({id:i+1,user_id:p.id,ingredient_name,quantity,quantity_unit,stock_status:'owned',is_owned:true}))});
}
let providerCalls=0;
const receipt=async()=>{if(receiptPath){await writeFile(receiptPath,JSON.stringify({syntheticOnly:!providerHandler,syntheticDataOnly:true,providerMode:providerHandler?'bounded-real-provider':'loopback-mock',hostedConnections:0,...(providerSummary?providerSummary():{externalProviderCalls:0}),mockedProviderCalls:providerCalls,events:lab.events},null,2));if(providerHandler||offlineSix){const {rows}=await lab.db.query('select id,status,result from public.smartcart_generation_jobs where user_id=$1 order by created_at',[lab.people.find(p=>p.key==='free').id]);await writeFile(path.join(path.dirname(receiptPath),'validated-plans.json'),JSON.stringify({syntheticDataOnly:true,plans:rows.map(r=>({jobId:r.id,status:r.status,result:r.status==='completed'?r.result:null}))},null,2));}}};
const send=(res,status,body,extra={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...extra});res.end(status===204?'':JSON.stringify(body));};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:3053');
  if(!fixtureOriginAllowed(req.headers.origin,url.pathname,offlineSix))return send(res,403,{message:'Loopback app origin only.'});
  res.setHeader('Access-Control-Allow-Origin',app);res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,accept-profile,content-profile,prefer,range');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');res.setHeader('Access-Control-Expose-Headers','Content-Range');
  if(req.method==='OPTIONS')return send(res,204,null);
  if(url.pathname==='/fixture'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>Assignment 02 synthetic lab</title><h1>Synthetic Pantry Only journey</h1><p>'+(providerHandler?'Disposable PostgreSQL and synthetic Auth. LIVE provider requests have an owner-approved five-attempt maximum. Open Free only. No production data or emails.':'Disposable PostgreSQL, fake Auth and mock AI. No production data, external calls or emails.')+'</p>'+lab.people.filter(p=>!providerHandler||p.key==='free').map(p=>'<p><a href="'+app+'/planner#access_token='+p.token+'&refresh_token=lab-'+p.key+'&expires_in=7200&token_type=bearer&type=magiclink">Open synthetic '+p.key+'</a></p>').join(''));
  }
  if(url.pathname==='/fixture/status')return send(res,200,{syntheticOnly:!providerHandler,syntheticDataOnly:true,mockedProviderCalls:providerCalls,...(providerSummary?providerSummary():{externalCalls:0}),events:lab.events});
  if(offlineSix&&url.pathname==='/fixture/expire-plus'){
   if(req.method==='POST'){const plus=lab.people.find(p=>p.key==='plus');plus.plan='free';await lab.db.query('update smartcart_profiles set plan=$1 where id=$2',['free',plus.id]);lab.events.push({stage:'synthetic-plus-expired'});await receipt();res.writeHead(200,{'Content-Type':'text/html'});return res.end('<p>Disposable Plus identity is now Free. No real account changed.</p><a href="/fixture">Return to synthetic identities</a>');}
   res.writeHead(200,{'Content-Type':'text/html'});return res.end('<form method="POST"><button>Expire only the disposable Plus identity</button></form>');
  }
  let text='';for await(const chunk of req){text+=chunk;if(text.length>200000)return send(res,413,{message:'Synthetic limit'});}
  const body=text?JSON.parse(text):{},token=/^Bearer (.+)$/i.exec(req.headers.authorization||'')?.[1],p=lab.people.find(p=>p.token===token),service=token==='local-test-service-only';
  if(url.pathname==='/auth/v1/user')return p?send(res,200,p.user):send(res,401,{message:'Synthetic identity required'});
  if(url.pathname==='/auth/v1/token'){const person=lab.people.find(p=>'lab-'+p.key===body.refresh_token);return person?send(res,200,{access_token:person.token,refresh_token:'lab-'+person.key,expires_in:7200,token_type:'bearer',user:person.user}):send(res,401,{message:'Synthetic refresh only'});}
  if(url.pathname==='/auth/v1/logout')return send(res,204,null);
  if(url.pathname.startsWith('/auth/'))return send(res,403,{message:'No signup, email or OAuth in this lab'});
  if(url.pathname==='/openai/v1/chat/completions'){
   if(providerHandler){
    if(token!=='local-broker-not-provider-key')return send(res,403,{error:{message:'Local broker credential required'}});
    try{const answer=await providerHandler(body,lab);await receipt();return send(res,answer.status,answer.body);}catch(error){await receipt();return send(res,403,{error:{message:'Local live-provider gate stopped this request.',code:/^[A-Z_]+$/.test(error.code||'')?error.code:'LOCAL_PROVIDER_GATE'}});}
   }
   if(token!=='mock-provider-no-paid-calls')return send(res,403,{error:{message:'Mock key only'}});
   providerCalls++;lab.events.push({stage:'generation',provider:'loopback-mock',externalCalls:0});await receipt();
   if(offlineSix){
    const result=offlinePantryResult(body,six);
    return send(res,200,{choices:[{message:{role:'assistant',content:JSON.stringify(result)}}],model:body.model,usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0}});
   }
   const allText=body.messages.map(m=>m.content).join('\n'),servings=Number(/Household Size:\s*(\d+)/.exec(allText)?.[1]||2);
   const ingredients=[{name:'Rice',amount:'1 cup',price:0},{name:'Canned chickpeas',amount:'1 cup',price:0},{name:'Green onion',amount:'1',price:0},{name:'Water',amount:'2 cups',price:0},{name:'Olive oil',amount:'1 tsp',price:0}];
   const meals=['Chickpea Rice Skillet','Chickpea Rice Soup'].map((name,i)=>({day:'Day '+(i+1),name,servings,description:'Synthetic engineering fixture: chickpeas, rice and green onion. Not professionally reviewed.',prep_time_minutes:25,ingredients:ingredients.map(x=>({...x,amount:i&&x.name==='Water'?'3 cups':x.amount}))}));
   await new Promise(resolve=>setTimeout(resolve,1500));
   return send(res,200,{id:'mock-'+crypto.randomUUID(),object:'chat.completion',model:body.model,choices:[{index:0,message:{role:'assistant',content:JSON.stringify({meals,desserts:[],estimated_total_cost:0,budget_summary:'Measured synthetic pantry',upgrade_available:false})},finish_reason:'stop'}],usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0}});
  }
  const table=url.pathname.replace('/rest/v1/','');
  if(table.startsWith('rpc/')){
   const name=table.slice(4);
   if(name==='save_mealcaddie_week'){
    if(!p)return send(res,401,{message:'Synthetic owner required'});if(body.pantry!==null&&p.plan!=='plus')return send(res,403,{message:'Plus pantry persistence required'});
    state.get(p.id).week=body.meals.map((m,i)=>({id:i+1,user_id:p.id,name:m.recipe_data.name,meal_title:m.recipe_data.name,type:m.type,recipe_data:m.recipe_data,status:'active_week'}));
    if(body.pantry!==null)state.get(p.id).pantry=body.pantry.map((x,i)=>({id:i+1,user_id:p.id,ingredient_name:x.name,quantity:x.quantity??null,quantity_unit:x.unit??null,stock_status:x.status,is_owned:true}));
    lab.events.push({stage:'week-save',owner:p.key,pantryIncluded:body.pantry!==null});await receipt();return send(res,200,null);
   }
   if(!service)return send(res,403,{message:'Synthetic service required for jobs'});
   const answer=await lab.admin.rpc(name,body);await receipt();return send(res,200,answer.data);
  }
  if(table==='smartcart_generation_jobs'||table==='smartcart_profiles'){
   const key=table.endsWith('profiles')?'id':'owner_key',value=url.searchParams.get(key)?.replace(/^eq\./,'');
   if(!service&&(!p||value!==p.id))return send(res,403,{message:'Synthetic server only'});
   const q=lab.admin.from(table);if(req.method==='PATCH')q.update(body);else q.select(url.searchParams.get('select')||'*');
   for(const [key,value] of url.searchParams){const match=/^(eq|lt|gte|neq|is)\.(.*)$/.exec(value);if(match)q[match[1]](key,match[2]==='null'?null:match[2]);}
   q.limit(Number(url.searchParams.get('limit')||100));
   const single=(req.headers.accept||'').includes('application/vnd.pgrst.object+json'),answer=await q.execute(single);await receipt();return send(res,200,answer.data);
  }
  if(['weekly_menus','pantry_inventory','archived_meals'].includes(table)){
   const owner=url.searchParams.get('user_id')?.replace(/^eq\./,'');if(!p||p.id!==owner)return send(res,403,{message:'Synthetic row owner required'});
   return send(res,200,state.get(owner)[table==='weekly_menus'?'week':table==='pantry_inventory'?'pantry':'vault']);
  }
  return send(res,404,{message:'Unimplemented synthetic endpoint'});
 }catch(error){lab.events.push({stage:'fixture-error',path:new URL(req.url,'http://127.0.0.1:3053').pathname,category:error.constructor.name});await receipt();send(res,500,{message:'Synthetic fixture failure; inspect lab code, no automatic retries.'});}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3053,'127.0.0.1',resolve);});
console.log('Disposable PostgreSQL lab: http://127.0.0.1:3053/fixture; '+(providerHandler?'bounded live provider enabled by owner':'mock provider; no external calls')+'.');
async function close(){await new Promise(resolve=>server.close(resolve));await receipt();await lab.close();}
if(installSignalHandlers){process.once('SIGINT',()=>void close().then(()=>process.exit(0)));process.once('SIGTERM',()=>void close().then(()=>process.exit(0)));}
return {lab,server,close,state};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await startPantryLab();
