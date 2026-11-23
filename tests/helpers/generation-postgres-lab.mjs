// Disposable PostgreSQL adapter for the REAL generation RPCs, never hosted data.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export async function generationPostgresLab(){
 const db=new PGlite(),events=[];
 const people=[['free','10000000-0000-4000-8000-000000000001','free',true],['plus','10000000-0000-4000-8000-000000000002','plus',true],['denied','10000000-0000-4000-8000-000000000003','free',false]].map(([key,id,plan,allowed])=>({key,id,plan,allowed,token:'lab-'+key,email:key+'@assignment02.invalid',email_confirmed_at:'2026-01-01T00:00:00Z'}));
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create table public.smartcart_profiles(id uuid primary key,plan text,email text,beta_status text); grant usage on schema public to service_role;');
 await db.exec(await readFile(new URL('../../docs/supabase-generation-jobs.sql',import.meta.url),'utf8'));
 for(const p of people){await db.query('insert into auth.users values($1)',[p.id]);await db.query('insert into smartcart_profiles(id,plan,email) values($1,$2,$3)',[p.id,p.plan,p.email]);}
 class Query{
  constructor(table){if(!['smartcart_profiles','smartcart_generation_jobs'].includes(table))throw Error('Unsupported synthetic table');this.table=table;this.filters=[];this.maximum=100;}
  select(columns='*'){this.columns=columns;return this;}
  update(change){this.change=change;return this;}
  filter(column,op,value){if(!['id','owner_key','user_id','status','lease_until','created_at'].includes(column))throw Error('Unsupported filter');this.filters.push({column,op,value});return this;}
  eq(c,v){return this.filter(c,'=',v);}lt(c,v){return this.filter(c,'<',v);}gte(c,v){return this.filter(c,'>=',v);}neq(c,v){return this.filter(c,'<>',v);}is(c,v){if(v!==null)throw Error('Only null supported');return this.filter(c,'is',null);}
  order(){return this;}limit(n){this.maximum=Math.min(100,Math.max(1,n));return this;}abortSignal(){return this;}
  async execute(single=false){
   const values=[];const add=v=>{values.push(v);return '$'+values.length;};
   const where=()=>this.filters.length?' where '+this.filters.map(f=>f.op==='is'?f.column+' is null':f.column+' '+f.op+' '+add(f.value)).join(' and '):'';
   let sql;
   if(this.change){const fields=Object.entries(this.change);if(fields.some(([k])=>!['status','error','updated_at'].includes(k)))throw Error('Unsupported synthetic update');sql='update '+this.table+' set '+fields.map(([k,v])=>k+'='+add(v)).join(',')+where()+' returning *';}
   else sql='select * from '+this.table+where()+(this.table.endsWith('jobs')?' order by created_at desc':'')+' limit '+this.maximum;
   const {rows}=await db.query(sql,values);
   if(this.columns?.includes('dinners:'))for(const r of rows)r.dinners=r.result?.meals;
   events.push({stage:this.change?'status-maintenance':'read',table:this.table,owner:this.filters.find(f=>f.column==='owner_key')?.value,rows:rows.length});
   return {data:single?(rows[0]??null):rows,error:null};
  }
  maybeSingle(){return this.execute(true);}then(resolve,reject){return this.execute().then(resolve,reject);}
 }
 const admin={
  auth:{getUser:async token=>{const p=people.find(p=>p.token===token);return {data:{user:p?{...p,is_anonymous:false}:null},error:p?null:{status:401}};}},
  from:table=>new Query(table),
  async rpc(name,p){
   if(name==='beta_product_access'){const person=people.find(x=>x.id===p.p_user);return {data:{allowed:!!person?.allowed,reason:person?.allowed?'synthetic-approved':'synthetic-denied'},error:null};}
   const specifications={
    smartcart_create_generation_job:['select public.smartcart_create_generation_job($1,$2,$3,$4,$5,$6,$7,$8,$9) result',[p.p_owner,p.p_quota,p.p_user,p.p_request,p.p_hash,JSON.stringify(p.p_input),p.p_plan,p.p_limit,p.p_seconds]],
    smartcart_claim_generation_job:['select public.smartcart_claim_generation_job($1) result',[p.p_id]],
    smartcart_finish_generation_job:['select public.smartcart_finish_generation_job($1,$2,$3,$4,$5,$6,$7) result',[p.p_id,p.p_attempt,p.p_status,JSON.stringify(p.p_result),p.p_error,JSON.stringify(p.p_usage),p.p_retry_seconds||0]],
   };
   if(!specifications[name])throw Error('Unsupported synthetic RPC');
   const [sql,args]=specifications[name],{rows}=await db.query(sql,args);
   events.push({stage:name.includes('create')?'reservation':name.includes('claim')?'claim':'persistence',rpc:name,owner:p.p_owner,jobId:p.p_id||rows[0].result?.job?.id,status:p.p_status||rows[0].result?.job?.status,reused:rows[0].result?.reused});
   return {data:rows[0]?.result??null,error:null};
  },
 };
 return {db,people,admin,events,close:()=>db.close()};
}
