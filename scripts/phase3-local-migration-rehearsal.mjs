// Local-only final-candidate reconciliation and rollback rehearsal. Never accepts a remote host.
import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const {Client}=createRequire(new URL('../../local-test-tools/package.json',import.meta.url))('pg');
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_mealcaddie-auth-isolated'],{encoding:'utf8'}))[0];
for(const ports of Object.values(container.HostConfig.PortBindings))for(const binding of ports)assert.equal(binding.HostIp,'127.0.0.1');
const env=Object.fromEntries(container.Config.Env.map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)];}));
const db=new Client({host:'127.0.0.1',port:54322,user:'postgres',password:env.POSTGRES_PASSWORD,database:'postgres'});await db.connect();
const sql=readFileSync('supabase/migrations/20261011141927_beta_onboarding.sql','utf8');
const tables=['auth.users','public.smartcart_profiles','public.smartcart_subscriptions','public.archived_meals','public.pantry_inventory','public.weekly_menus'];
const fingerprint=async()=>{const result={};for(const table of tables){if(!(await db.query('select to_regclass($1) t',[table])).rows[0].t)continue;result[table]=(await db.query(`select count(*) n,md5(coalesce(jsonb_agg(x order by x.id)::text,'[]')) hash from ${table} x`)).rows[0];}return result;};
try{
 const before=await fingerprint();
 // Reconcile only the earlier disposable candidate, then exercise exact empty-only rollback.
 if(!(await db.query("select to_regclass('public.beta_delivery_events') t")).rows[0].t){
 await db.query(sql.match(/create table public\.beta_delivery_events \([\s\S]*?\n\);/)[0]);
 await db.query(sql.match(/create function public\.beta_delivery_event\([\s\S]*?end \$\$;/)[0]);
 }
 await db.query("delete from beta_applications where email like 'phase3-%@example.invalid'");
 await db.query("delete from beta_operation_rates where user_id in(select id from auth.users where email like 'phase3-%@example.invalid')");
 await db.query(readFileSync('docs/beta-onboarding/rollback-empty-only.sql','utf8'));
 assert.deepEqual(await fingerprint(),before,'rollback must preserve account, billing and saved-content fingerprints');
 await db.query(sql);
 assert.deepEqual(await fingerprint(),before,'final migration must preserve account, billing and saved-content fingerprints');
 const security=(await db.query("select count(*) n from pg_tables t join pg_class c on c.relname=t.tablename join pg_namespace s on s.oid=c.relnamespace and s.nspname=t.schemaname where t.schemaname='public' and t.tablename in ('beta_invitations','beta_invitation_deliveries','beta_participations','beta_feedback','beta_engagement_events','beta_engagement_daily','beta_operation_rates','beta_delivery_events') and c.relrowsecurity")).rows[0].n;
 assert.equal(Number(security),8);await db.query("notify pgrst,'reload schema'");
 console.log('PASS final exact PostgreSQL migration, empty-only rollback/reapplication, eight RLS tables and unchanged accounts/billing/vault/pantry/menu fingerprints. SHA256 '+createHash('sha256').update(sql).digest('hex'));
}finally{await db.end();}
