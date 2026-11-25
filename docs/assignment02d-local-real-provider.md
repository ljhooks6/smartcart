# Assignment 02D — bounded local real-provider verification

Historical preparation record. **Assignment 02E has now run once and failed compatible-unit validation after one successful real-provider response. PR17 was released independently; PR18 remains draft.** See `docs/assignment02e-results.md` for current results. The run below is consumed: do not execute its historical startup commands again.

Date: November 23, 2026, America/Chicago. Existing branch: fix/pantry-only-e2e, based on PR18 head b61ef624ed48508cc62a2f2cec6274e7c1beb9f5, stacked on PR17. No new Supabase project/account, paid upgrade, production connection, hosted setting or PR9 change.

## Implemented, not another infrastructure proposal

The existing disposable PGlite generation database, synthetic Auth fixture, actual application API/dispatcher/worker and browser workflow are reused. Default fixture execution remains mock-only. An optional owner-operated launcher starts the same loopback lab with a bounded live-provider bridge and synthetic measured stock. Application source, server dietary guards, database definitions, package manifest and lockfile are unchanged.

- Private key is entered only at a hidden prompt in the owner's normal terminal. It is held in the launcher process, never placed in arguments, environment files, child environment, browser, receipts or Git. A dedicated existing testing key is preferred. No key is created/read during preparation. No secure erasure of JavaScript process memory is claimed.
- Only fixed https://api.openai.com/v1/chat/completions is reachable by the live transport, with normal TLS verification, no redirects and no SDK/proxy retries. Unsafe TLS/preload environment options stop startup. The application gets a dummy key and loopback base URL; its Supabase URL/keys are synthetic loopback values. Hosted .env files cause refusal.
- One prepared run binds to one local synthetic Free owner/job and the reviewed input hash. One selected returned meal may bind a Cook recipe. Another job or recipe is denied, including after reopening the ledger.
- Durable disk receipts consume a permit before dispatch: **at most 3 planning + 2 recipe requests, 5 total**, shared across worker retries and process attempts. A lock serializes changes; a pending/crashed attempt, timeout, transport failure, provider 408/5xx, inconsistent usage or nonstandard billing tier freezes further work. HTTP rejection still consumes its permit. Rearming/restarting a used run is forbidden.
- Logs retain ordinal, model, timing, status, safe provider request ID/error category, usage when available and content hashes. No prompt, key, dietary text or raw error dump. A dispatching entry without a terminal receipt is explicitly uncertain, not proof of a completed request. Validated synthetic plan outputs are saved separately for quality review.
- Free cloud pantry persistence remains unavailable. The local Free user enters the measured pantry in the UI; no Plus grant is introduced. Job storage uses actual checked-in PostgreSQL RPCs; week/pantry REST save behavior remains a disposable in-memory adapter, not hosted Supabase proof.

## Limits and financial disclosure before authorization

| Boundary | Verified implementation |
|---|---|
| Planning model / attempts | Existing Free gpt-4.1; maximum 3 |
| Cook recipe model / attempts | Existing Free gpt-6-luna; maximum 2, for one selected returned meal |
| Total calls | Maximum 5 durable reservations; failures consume permits |
| Input | Maximum 32,768 UTF-8 bytes of complete serialized messages, including corrections; text only, at most 8 messages; no images/tools/streaming/multiple completions. The ordinary mocked request measured 15,724 bytes, leaving correction headroom. |
| Output | Planning max_completion_tokens <= 4,096; recipe <= 3,500, including reasoning where applicable |
| Billing tier | Explicit default/standard; a different reported tier freezes the run |
| Exact input tokenization | Not independently available for both models in this checkout. No tokenizer package was installed. The byte bound is NOT claimed to equal a 32,768-token cap. Usage tokens are recorded after responses. |

At current standard rates, a 32,768-input-token-per-call assumption would yield about **$0.305** for all five requests. That assumption is not a verified local token cap, so **$0.31 is not a guaranteed ceiling**. Using the published full model context maxima instead gives a deliberately conservative model-token exposure of about **$6.60** for all five requests with the enforced output limits (taxes excluded):

- 3 × (1,047,576 × $2/million + 4,096 × $8/million).
- 2 × (1,050,000 × $0.10/million + 3,500 × $0.50/million).

The actual 32 KiB input restriction is much tighter in practice, but no invented tokenizer assurance is used. This is a current-price calculation, not a provider-account invoice cap or protection against unrelated use of the key. Provider project limits/key exclusivity are unverified; no hosted budget setting or billing change is authorized. Request **up to $7 of model-token charges** for this five-attempt run, excluding tax, only after the owner accepts these exact bounds and supplies an existing suitable key privately. If the owner requires a lower guaranteed financial limit, stop for an approved provider-side control or verified tokenizer solution; do not silently treat an alert/estimate as enforcement.

Pricing/limits: [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [standard service tier](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). GPT-4.1 is marked deprecated; unavailable-model errors stop the run, with no model substitution.

## Completed verification

20 focused tests passed: dietary summary/transport regressions; real API and PostgreSQL reservation/claim/finish; bounded bridge using the actual OpenAI SDK with fake upstream responses; stock/servings validation; persistence/readback; one recipe; duplicate terminal delivery; per-kind and total caps; failures/uncertainty; concurrent requests; owner/job/recipe binding; oversized input/output guards and ledger corruption/rearm denial. Real paid calls: **0**.

The restricted Codex process returned EACCES on the socket check before any server/provider request. It was not worked around. Owner-assisted normal PowerShell then passed the actual loopback socket/SDK/worker/recipe check with fake provider responses. Its sanitized receipt is C:\Users\hooks\Documents\Codex\assignment02d-bridge-verification.json. TypeScript and targeted ESLint completed without diagnostics; Node syntax and git diff whitespace checks passed. No new production build was necessary for test-harness/documentation-only changes.

Existing Assignment02 browser evidence for Meals, scheduling, purchase-free Shop and Cook is retained. Those surfaces have NOT yet been rechecked with real generated output. No culinary quality, actual provider bill or hosted end-to-end success is claimed from the mock fixtures.

## One authorized live run — commands prepared, NOT executed

Existing prepared run: C:\Users\hooks\Documents\Codex\assignment02d-runs\2026-11-24T03-04-52-177Z-0e1fadf6 (UTC run identifier). Its ledger is prepared with zero attempts. Do not generate another run to bypass a limit or uncertain outcome.

After explicit chat approval of the five-attempt/$7 scope and credential availability, the owner runs in a private normal non-administrator PowerShell terminal with recording/transcription/screen-sharing off:

```powershell
& 'C:\dev\tools\node-v22.22.0-win-x64\node.exe' 'C:\Users\hooks\Documents\Codex\mealcaddie-pantry-only-fix\tests\fixtures\pantry-only-real-provider.mjs' serve 'C:\Users\hooks\Documents\Codex\assignment02d-runs\2026-11-24T03-04-52-177Z-0e1fadf6'
```

Type APPROVED-LOCAL-FIVE-ATTEMPTS only after that approval; enter the existing testing key at the hidden prompt, never in chat. If unavailable or a security condition fails, stop. Do not create keys, change hosted budgets or weaken TLS automatically.

1. Open http://127.0.0.1:3053/fixture in connected normal Chrome and choose synthetic Free. All Auth responses and user data are synthetic. Configure household 2, budget 60, Pantry Only, Stovetop, Under 1 hour, no dessert/breakfast/lunch or include/avoid requests. Keep the declared unrestricted dietary payload exactly as submitted; never clear a genuine restriction.
2. Enter the measured fixture through the ordinary pantry UI: Rice 8 cup; Black beans 6 cup; Chickpeas 6 cup; Carrots 8 each; Onions 6 each; Tomatoes 6 each; Garlic 12 clove; Olive oil 16 tbsp; Salt 4 tsp; Black pepper 2 tsp; Water 24 cup. The live gate rejects different inventory/household/equipment/time/optional-meal settings. Name-only amounts never imply sufficiency.
3. Generate once. Capture request equality/hash, one idempotency/job ID, reservation, local dispatch/worker, all provider attempts and validation. If uncertain, stop: no new job/request key, rearm or reset. No hosted Vercel Queue is being exercised.
4. If a plan completes, inspect 1–7 distinct dinners, servings two, combined inventory fit, practical techniques/yield/time, exact ingredients, no purchases/restock and omission notices. Save/reload the same result without another planning call. Select/schedule dinners and inspect Meals, Shop and Cook; only then open one recipe, with at most its one correction. Verify no recipe ingredient/amount drift and no unsupported safety claims. Genuine rejection is a FAIL, not permission to weaken checks.
5. Keep the helper running during reload/persistence checks. At completion Ctrl+C closes the child and disposable database and the budget. Do not claim recovery across destroying this in-memory test database. Sanitized attempts/journey/validated-plan receipts remain in the run folder; no secret file was created. Do not restart a used run without a new explicit decision. Browser local synthetic caches may be cleared only for the loopback lab after evidence is captured.

## Independent PR17 release assessment

Reviewed the exact cc2a5a5bf749c384f5b363bfe893f5a2d78e975c diff against main a0c8bf72df5430b1475e6802eb955776c182da5c: six files; no server safety guard, allowlist, Auth, quota, database, billing or provider change. The helper preserves every nonempty dietary string byte-for-byte, including its significant leading newline; only genuinely blank input becomes No preference. All three request paths use it. New fresh forms no longer select Vegetarian; existing saved/household preferences retain their restoration path. Review warns on unknown/malformed fields rather than hiding them.

**Recommend PR17 as an independent narrow release after owner approval**, based on the existing evidence plus focused rerun of its transport/restriction/restoration tests. It fixes false dietary rejection, not complete Pantry Only reliability. Its server guard continues to reject real allergies, intolerances, medical/ambiguous and malformed information. It does not claim quantity sufficiency, fewer-than-seven reliability or real-model quality; those depend on PR18. No merge/deploy is authorized here.

**PR18: hold for the authorized real-provider result and owner review.** Even after local success, real hosted Auth, deployed RPC configuration, queue delivery/worker routing, shared quotas, permissions, RLS/storage behavior and provider credentials in Preview remain unverified. Do not present this local test as hosted certification. Use an explicit risk-acceptance/release decision for any remaining hosted gap; never test customer data or provision another application's infrastructure to fill it.

## Product friction and smallest next steps

Measured amounts are necessary for a confirmed purchase-free household plan but make first-use exploration demanding. All suggestions currently compete for one stock ledger, which can surprise users treating them as alternatives. IMP-006 records a proposed separate exploratory state with visibly unverified quantities, followed by measurement/validation of selected meals. It must not claim pantry sufficiency or relax allergy restrictions. No redesign was implemented.

Next: confirm an existing dedicated key is available; explicitly authorize this one five-attempt/$7 local run; complete and review actual output/browser evidence; then decide PR17 and PR18 releases separately. No infrastructure, key creation, hosted configuration, real accounts, production write, merge or deployment occurred.
