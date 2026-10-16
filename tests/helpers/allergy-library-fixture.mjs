import {readFileSync} from 'node:fs';
import {fixture,root,free,plus,admin,paid,stranger} from './beta-onboarding-fixture.mjs';
export {free,plus,admin,paid,stranger};
export async function libraryFixture(){
 const db=await fixture();await root(db);
 await db.exec(`alter table archived_meals add column ingredients jsonb,add column instructions jsonb,add column recipe_data jsonb;
 alter table smartcart_subscriptions add column user_id uuid,add column provider text,add column provider_subscription_id text,add column current_period_end timestamptz;
 create table weekly_menus(id uuid primary key default gen_random_uuid(),user_id uuid,meal_title text,type text,recipe_data jsonb,servings_count integer,status text);
 create table custom_groceries(id uuid primary key default gen_random_uuid(),user_id uuid,item_name text);
 create table user_sessions(id uuid primary key default gen_random_uuid(),user_id uuid,weeklymenu jsonb);
 create table profiles(id uuid primary key,dietary_preferences text);
 alter table weekly_menus enable row level security;alter table custom_groceries enable row level security;alter table user_sessions enable row level security;alter table profiles enable row level security;
 create policy own on weekly_menus for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 create policy own on custom_groceries for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 create policy own on user_sessions for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 create policy own on profiles for all to authenticated using(auth.uid()=id) with check(auth.uid()=id);
 grant select,insert,update,delete on weekly_menus,custom_groceries,user_sessions,profiles to authenticated;
 `);
 await db.exec(readFileSync('supabase/migrations/20261012222908_public_beta_access_and_agreements.sql','utf8'));
 await db.exec(readFileSync('docs/supabase-generation-jobs.sql','utf8'));
 await db.query("insert into beta_preserved_accounts(user_id,reason) values($1,'existing_free_pending_review'),($2,'existing_free_pending_review')",[free,plus]);
 await db.exec('update beta_access_configuration set enabled=true');
 async function asRole(role,user,fn){return db.transaction(async tx=>{await tx.exec('reset role');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user??'']);if(role!=='root')await tx.exec('set local role '+role);return fn(tx);});}
 const name=s=>{if(!/^[a-z_][a-z0-9_]*$/.test(s))throw Error('unsafe test identifier');return '"'+s+'"';};
 function client(role,user){
  const auth={getUser:async token=>({data:{user:token==='invalid'?null:await getUser(user)},error:null}),admin:{getUserById:async id=>({data:{user:await getUser(id)},error:null})}};
  async function getUser(id){return asRole('root',null,async tx=>(await tx.query('select * from auth.users where id=$1',[id])).rows[0]??null);}
  return {auth,async rpc(rpc,args){try{return await asRole(role,user,async tx=>{const entries=Object.entries(args);const types={smartcart_create_generation_job:['text','text','uuid','uuid','text','jsonb','text','int','int'],smartcart_claim_generation_job:['uuid'],smartcart_finish_generation_job:['uuid','int','text','jsonb','text','jsonb','int'],beta_product_access:['uuid'],beta_effective_plan:['uuid'],save_mealcaddie_week:['jsonb','jsonb']}[rpc];if(!types)throw Error('unsupported RPC');const values=entries.map(([_,v],i)=>types[i]==='jsonb'&&v!==null?JSON.stringify(v):v);const row=await tx.query(`select public.${name(rpc)}(${entries.map(([key],i)=>`${name(key)} => $${i+1}::${types[i]}`).join(',')}) value`,values);return {data:row.rows[0].value,error:null};});}catch(e){return {data:null,error:{message:e.message}};}},
   from(table){const filters=[],params=[];let fields='*',op='select',values,limit,order;
    const q={select(value='*'){fields=value;return q;},update(value){op='update';values=value;return q;},upsert(value){op='upsert';values=value;return q;},eq(k,v){params.push(v);filters.push(`${name(k)}=$${params.length}`);return q;},neq(k,v){params.push(v);filters.push(`${name(k)}<>$${params.length}`);return q;},lt(k,v){params.push(v);filters.push(`${name(k)}<$${params.length}`);return q;},gte(k,v){params.push(v);filters.push(`${name(k)}>=$${params.length}`);return q;},is(k,v){if(v!==null)throw Error('test is only null');filters.push(`${name(k)} is null`);return q;},order(k,{ascending}){order=`${name(k)} ${ascending?'asc':'desc'}`;return q;},limit(n){limit=n;return q;},abortSignal(){return q;},maybeSingle(){return run(true);},then(ok,bad){return run(false).then(ok,bad);}};
    async function run(single){try{return await asRole(role,user,async tx=>{
     let sql;
     if(op==='upsert'){const entries=Object.entries(values),columns=entries.map(([k])=>name(k));const vals=entries.map(([,v])=>typeof v==='object'&&v!==null?JSON.stringify(v):v);const r=await tx.query(`insert into public.${name(table)}(${columns.join(',')}) values(${entries.map((_,i)=>'$'+(i+1)).join(',')}) on conflict(id) do update set ${columns.filter(c=>c!=='"id"').map(c=>`${c}=excluded.${c}`).join(',')}`,vals);return {data:r.rows,error:null};}
     if(op==='update'){const entries=Object.entries(values);const sets=entries.map(([key,value])=>{params.push(value);return `${name(key)}=$${params.length}`;});sql=`update public.${name(table)} set ${sets.join(',')}`;}
     else {const columns=fields==='*'?'*':fields.split(',').map(c=>c==='dinners:result->meals'?`result->'meals' as dinners`:c==='rejected:input->recentRejectedMeals'?`input->'recentRejectedMeals' as rejected`:name(c)).join(',');sql=`select ${columns} from public.${name(table)}`;}
     if(filters.length)sql+=' where '+filters.join(' and ');if(op==='select'&&order)sql+=' order by '+order;if(op==='select'&&limit)sql+=' limit '+Number(limit);
     const r=await tx.query(sql,params);return {data:single?r.rows[0]??null:r.rows,error:null};
    });}catch(e){return {data:null,error:{message:e.message}};}}
    return q;
   }};
 }
 return {db,admin:client('service_role',null),user:id=>client('authenticated',id),async count(){return (await db.query("select count(*)::int n from smartcart_generation_jobs where status in ('queued','running','completed')")).rows[0].n;}};
}
