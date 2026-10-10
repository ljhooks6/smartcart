# Reliable full-plan generation

Full plans are saved as Supabase jobs and processed through a private Vercel Queue consumer. The browser submits quickly, shows progress and recovers the latest owned job after refresh. Closing progress keeps the current week usable. Completed options do not reset shopping or recipe progress.

## Allowances

- Guest: 3 new plans per UTC day. Anonymous allowance is shared by the trusted network address, hashed with a server secret. A new guest cookie cannot bypass it.
- Free: 10 new plans per UTC week (Monday reset).
- Plus: 60 new plans per UTC week (Monday reset).

Only full-plan generation uses these limits. Existing plans, recipes and cooking remain available. Queued/running jobs reserve allowance; failed jobs release it. All attempts contribute to the short cooldown: at most 3 new requests in 10 minutes per quota identity. Repeating a request key or submitting while a job is active reuses that job.

## Work and failure controls

Database claims cap active workers at 3 and recent job starts at 6/minute. At most 200 queued jobs are admitted. Each worker permits at most 3 provider calls and a 240-second overall generation deadline; the function deadline is 300 seconds and the lease is 6 minutes. Jobs waiting over 30 minutes fail with a retry message. Queue messages expire after an hour; jobs older than 30 days are cleaned during reservation.

Retry only explicit temporary provider rejection before any successful provider response, at most 3 attempts. Retry-After is saved in the database as well as queue scheduling. Timeouts, uncertain paid requests and partially completed provider calls are terminal to avoid duplicate spending. Redelivery cannot claim active/completed work again. Writes are fenced by attempt number.

Server authentication verifies identity and membership; the worker checks signed-in membership again. Plus remains GPT-6.1 Sol; other model routing is unchanged. Responses are private/no-store. Browser database roles cannot read jobs or invoke job functions. Guests own jobs through an HttpOnly cookie: clearing it loses recovery access but does not reset the network allowance.

## Validation

Production build and 58 regression tests passed. Isolated Postgres tests confirmed 50 duplicate submissions created one job, and 50 independent claims respected the three-worker cap. Quotas, access control, fencing and persisted retry delays passed.

The isolated browser check used the actual job API and Postgres with a simulated worker. Submitting, continuing, refreshing, recovering running status and displaying seven completed meal options produced one job and one worker run. No production fixture data was created.

Three small concurrent Sol requests finished in 2.5-2.9 seconds. Provider headers showed account limits of 10,000 requests/minute and 4,000,000 tokens/minute. Short requests do not establish full-plan capacity or sustained load performance. Live schema verification confirmed RLS, denied browser reads, invoker functions and fixed search paths.

Check production queue delivery after release. Local fallback uses Next.js after() and database leases rather than Vercel Queue infrastructure. Observe sustained full-plan traffic and token spend before raising worker limits.

Production delivery passed: one guest request completed seven meals in about 15 seconds. Repeating the same key reused the job; stored evidence showed one attempt and one provider call. Queue admission is serialized across quota identities; a 50-request test against 199 queued jobs admitted one and rejected 49.
