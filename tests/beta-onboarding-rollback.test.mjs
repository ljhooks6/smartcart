import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,root,activated,free} from './helpers/beta-onboarding-fixture.mjs';
const rollback=readFileSync('docs/beta-onboarding/rollback-empty-only.sql','utf8');
test('empty-only rollback restores the exact original storage helper and allows clean reapplication',async()=>{
 const db=await fixture();try{
 const original=readFileSync('supabase/migrations/20261011062506_secure_pantry_vault_limits.sql','utf8').match(/as \$\$([\s\S]*?)\$\$;/)[1];
 await root(db);await db.exec(rollback);
 assert.equal((await db.query("select prosrc from pg_proc where proname='storage_plan'")).rows[0].prosrc.replace(/\r\n/g,'\n'),original.replace(/\r\n/g,'\n'));
 assert.equal((await db.query("select count(*) n from smartcart_profiles")).rows[0].n,5);
 await db.exec(readFileSync('supabase/migrations/20261011153040_beta_onboarding.sql','utf8'));
 assert.equal((await db.query("select onboarding_enabled from beta_programs")).rows[0].onboarding_enabled,false);
 }finally{await db.close();}
});
test('rollback refuses populated participation without deleting grants, feedback or content',async()=>{
 const db=await fixture();try{await activated(db,free);await root(db);await assert.rejects(db.exec(rollback),/Rollback refused/);await db.exec('rollback');assert.equal(Number((await db.query('select count(*) n from beta_participations')).rows[0].n),1);}finally{await db.close();}
});
