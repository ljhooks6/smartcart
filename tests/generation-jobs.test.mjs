import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

async function database() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); grant usage on schema public to service_role;');
  await db.exec(await readFile(new URL('../docs/supabase-generation-jobs.sql', import.meta.url), 'utf8'));
  return db;
}
async function reserve(db, owner, key = randomUUID(), hash = 'same', limit = 10, quota = owner, period = 604800) {
  return (await db.query('select public.smartcart_create_generation_job($1,$2,null,$3,$4,$5,\'free\',$6,$7) as reservation', [owner, quota, key, hash, JSON.stringify({ budget: 100 }), limit, period])).rows[0].reservation;
}
async function finish(db, job, state = 'completed') {
  await db.query('select public.smartcart_finish_generation_job($1,$2,$3,$4,$5,$6)', [job.id, job.attempts, state, JSON.stringify({ meals: [] }), null, '[]']);
}
async function claim(db, id) {
  return (await db.query('select public.smartcart_claim_generation_job($1) as claim', [id])).rows[0].claim;
}

test('50 simultaneous duplicate submissions create one saved job; different tabs share active work', async () => {
  const db = await database();
  try {
    const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 50 }, () => reserve(db, 'owner', key)));
    assert.equal(new Set(results.map(r => r.job.id)).size, 1);
    assert.equal(results.filter(r => !r.reused).length, 1);
    assert.equal((await reserve(db, 'owner')).job.id, results[0].job.id);
    assert.equal((await reserve(db, 'owner', key, 'different')).code, 'conflict');
    assert.equal((await db.query('select count(*)::int as n from public.smartcart_generation_jobs')).rows[0].n, 1);
    const first = await claim(db, results[0].job.id);
    await finish(db, first.job);
    assert.equal((await reserve(db, 'owner', key)).job.status, 'completed');
  } finally { await db.close(); }
});

test('worker concurrency is capped across owners; duplicate delivery cannot claim twice', async () => {
  const db = await database();
  try {
    const jobs = await Promise.all(Array.from({ length: 50 }, (_, i) => reserve(db, `owner-${i}`)));
    const claims = await Promise.all(jobs.map(r => claim(db, r.job.id)));
    assert.equal(claims.filter(r => r.job).length, 3);
    assert.equal(claims.filter(r => r.code === 'busy').length, 47);
    const first = claims.find(r => r.job).job;
    assert.equal((await claim(db, first.id)).code, 'busy');
    await finish(db, first);
    assert.equal((await claim(db, first.id)).code, 'done');
    assert.ok((await claim(db, jobs[3].job.id)).job);
  } finally { await db.close(); }
});

test('quota reservation is atomic; failures refund allowance and network quota survives new guest cookies', async () => {
  const db = await database();
  try {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => reserve(db, `guest-${i}`, randomUUID(), 'same', 3, 'shared-network', 86400)));
    assert.equal(results.filter(r => r.job).length, 3);
    assert.equal(results.filter(r => r.code === 'limit').length, 17);
    const j = (await claim(db, results[0].job.id)).job;
    await finish(db, j, 'failed');
    // Short cooldown still limits repeated failures even though weekly/daily allowance is refunded.
    assert.equal((await reserve(db, 'new-guest', randomUUID(), 'same', 3, 'shared-network', 86400)).code, 'burst');
    await db.exec("update public.smartcart_generation_jobs set created_at=created_at-interval '11 minutes'");
    assert.ok((await reserve(db, 'new-guest', randomUUID(), 'same', 3, 'shared-network', 86400)).job);
  } finally { await db.close(); }
});

test('crashed leases become terminal; fencing rejects stale writes; retries are bounded', async () => {
  const db = await database();
  try {
    const j = (await reserve(db, 'owner')).job;
    const first = (await claim(db, j.id)).job;
    await finish(db, { ...first, attempts: 99 });
    assert.equal((await db.query('select status from public.smartcart_generation_jobs where id=$1', [j.id])).rows[0].status, 'running');
    await db.exec("update public.smartcart_generation_jobs set lease_until=now()-interval '1 second'");
    assert.equal((await claim(db, j.id)).code, 'done');
    assert.equal((await db.query('select status from public.smartcart_generation_jobs where id=$1', [j.id])).rows[0].status, 'failed');
    const retryJob = (await reserve(db, 'retry-owner')).job;
    for (let i=0;i<3;i++) { const attempt=(await claim(db,retryJob.id)).job; assert.ok(attempt); await finish(db,attempt,'queued'); }
    assert.equal((await claim(db,retryJob.id)).code,'done');
  } finally { await db.close(); }
});

test('browser roles cannot read jobs, forge quotas, start work or overwrite results', async () => {
  const db = await database();
  try {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.exec('select * from public.smartcart_generation_jobs'));
      await assert.rejects(reserve(db, 'forged'));
      await assert.rejects(claim(db, randomUUID()));
      await assert.rejects(db.exec('truncate public.smartcart_generation_jobs'));
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    assert.ok((await reserve(db, 'trusted')).job);
  } finally { await db.close(); }
});

 test('persisted provider cooldown survives polling and does not spend another attempt', async () => {
  const db = await database();
  try {
    const job=(await claim(db,(await reserve(db,'backoff')).job.id)).job;
    await db.query('select public.smartcart_finish_generation_job($1,$2,$3,null,null,$4,$5)',[job.id,job.attempts,'queued','[]',120]);
    const blocked=await claim(db,job.id);assert.equal(blocked.code,'busy');assert.ok(blocked.retryAfter>=119);
    assert.equal((await db.query('select attempts from public.smartcart_generation_jobs where id=$1',[job.id])).rows[0].attempts,1);
    await db.exec("update public.smartcart_generation_jobs set retry_at=now()-interval '1 second'");
    assert.equal((await claim(db,job.id)).job.attempts,2);
  }finally {await db.close();}
});

 test('global queue admission stops at capacity across different quota identities', async () => {
  const db=await database();
  try {
    await db.exec("insert into public.smartcart_generation_jobs(owner_key,quota_key,request_key,input_hash,input,plan) select 'seed-'||n,'seed-'||n,gen_random_uuid(),'seed','{}'::jsonb,'free' from generate_series(1,199) n");
    const results=await Promise.all(Array.from({length:50},(_,i)=>reserve(db,'admission-'+i)));
    assert.equal(results.filter(r=>r.job).length,1);assert.equal(results.filter(r=>r.code==='busy').length,49);
    assert.equal((await db.query("select count(*)::integer n from public.smartcart_generation_jobs where status='queued'")).rows[0].n,200);
  }finally{await db.close();}
});
