# Assignment 02 — Pantry Only reliability evidence

Date: 2026-11-23. Branch: `fix/pantry-only-e2e`, stacked on Assignment 01 / draft PR #17 (`cc2a5a5`). PR #17 is not merged or modified by this assignment. Production main includes PRs #14–#16; their work is not duplicated.

## Result and release recommendation

**Local end-to-end PASS; hosted real-generation proof NOT PERFORMED. Keep the PR draft for review, not a blanket production-ready claim.**

The connected local Chrome session exercised the actual application and API, real checked-in generation PostgreSQL functions in disposable PGlite, the actual local dispatcher/worker, the OpenAI SDK pointed only at a loopback mock, persisted job results, reload, Meals, selection, Shop and Cook. Auth responses and provider content were synthetic. The hosted Vercel Queue service was not exercised; its send/idempotency contract was tested through an adapter. Local dispatch used Next's existing `after()` path.

No authorized disposable hosted MealCaddie identity with working credentials was available in the connected session. Existing Preview uses shared infrastructure; no real beta account, production job/quota record, account creation or live provider call was used. A controlled hosted journey with an explicitly authorized test identity remains a release prerequisite. No emails or paid AI evaluations occurred.

## Confirmed quantity defects and correction

Before correction, the request schema discarded `pantryInventory`, and the generator accepted a one-cup recipe against half a cup of available rice. Both deterministic regressions failed before implementation and now pass.

- The current owner-scoped pantry snapshot is included in the planning request and retained in the existing private job JSON. No storage migration or entitlement change is needed.
- Pantry Only requires usable measured amounts. Unknown quantities, zero stock, restock items, unknown units and package sizes do not imply sufficiency. With no measured inventory, client/API stop with an actionable explanation before reservation or AI. Ordinary Pantry + store behavior is unchanged.
- Prompts use the same measured inventory and request explicit household servings. Unknown inventory cannot be promoted to available merely by a stock label.
- One deterministic ledger covers all returned dinners and desserts. It uses the existing ingredient parser/reviewed aliases and reliable unit conversions. Whole recipes that exceed remaining stock or need ambiguous conversions are omitted without committing partial deductions. If none fit, return a clear 422; never invent a dish or purchase to fill the plan.
- Existing diet, ingredient-name, equipment, time and household checks still run. No allergy guard, parser, allowlist, Auth policy, quota, billing rule or database definition changed.
- Results have zero additional purchase costs and no restock items; the UI explains the measured snapshot and omitted options. Stock is not physically deducted or reserved.

## Evidence by stage

| Stage | Evidence | Scope / result |
|---|---|---|
| Current inputs | Browser chose Pantry Only with 6 owner inventory entries (5 measured, 1 unknown). Empty structured diet from Assignment 01 was retained. Integration asserts the entire parsed request equals the submitted input. | PASS locally; quantities and preferences retained. |
| Authentication / ownership | Actual product-access and membership middleware over fake Auth identities; missing/invalid/unapproved identities denied. Cross-owner GET returns 404. Browser Free session had 0 pantry entries and none of Plus's week. | PASS; hosted Auth was not retested. |
| Reservation | Real `smartcart_create_generation_job` SQL; 202 queued job; Free remaining allowance 4. Eight duplicate submissions reuse one job; SQL suite also covers 50 simultaneous duplicates and 5/20 plan caps. | PASS in disposable PostgreSQL. |
| Dispatch | Real local `after()` dispatcher in browser; real Vercel dispatch function against queue adapter in integration tests. Idempotency key `plan:<jobId>`; definite send failure retains queued work for recovery. | Local PASS; real hosted queue unverified. |
| Generation / progress | Browser showed “Your plan is in line” with saved-request explanation. Actual worker claimed the job; SDK sent one HTTP request to loopback mock. Page reload recovered the persisted result without a second generation. | PASS; 1 mocked provider call, 0 external calls. |
| Validation | 1/3/7-option stock cases; overlapping requirements; reliable units vs density/package ambiguity; servings 1/2/4/6; dietary blocks; failed trial rollback; treats share the ledger. | PASS; deterministic constraints, not proof of cooking quality or allergen safety. |
| Persistence | Actual `smartcart_finish_generation_job` writes checked result to PostgreSQL. Owner GET/reload returns identical result. Duplicate delivery makes no second provider call. Interrupted lease is terminal with useful error. | PASS; no hosted records touched. |
| Meals | Browser displayed 2 distinct options, household servings and measured-stock notice after reload. | PASS. |
| Downstream | Both options selected Monday/Tuesday; Shop showed all five combined ingredient requirements as covered, no purchases, Store Mode disabled. Cook showed both scheduled meals. Save Week and reload restored both meals. | PASS; week/pantry save REST is a disposable in-memory fixture, not a live Supabase write. Existing storage SQL entitlement tests cover real save/RLS semantics. |
| Unknown quantities | Separate Free browser session added name-only Rice. Generate showed the measurement explanation without starting a job. Mocked provider count remained 1, belonging only to the earlier Plus run. | PASS. |

Browser receipt: `C:\Users\hooks\Documents\Codex\assignment02-browser-receipt.json`. Integration receipt: `C:\Users\hooks\Documents\Codex\assignment02-journey-receipt.json`. Synthetic browser job reference: `b94cde2c-31f7-43c7-ae89-0d54e6597c9b` (not a production ID).

Screenshots outside Git: `assignment02-progress.jpg`, `assignment02-meals.jpg`, `assignment02-shop.jpg`, `assignment02-unknown-quantity.jpg` in `C:\Users\hooks\Documents\Codex`.

## Test results

130 distinct relevant tests passed across two runs (the integrated journey was additionally rerun after its final assertion). Coverage includes generation API/jobs/feedback, stock arithmetic, pantry-only regression, original dietary transport, unchanged production allergy guards, recipe quantity/quality rules, grocery/scheduling, Free/Plus membership, direct storage/RLS entitlements and recipe persistence. TypeScript, ESLint and standard production build passed. Existing Browserslist-age and local Queue-region warnings remain informational; no dependency/configuration upgrade was introduced.

The browser fixture initially lacked a synthetic profile email; its normal email-sync path correctly refused that incomplete fixture operation. The fixture metadata was corrected, then the successful journey ran with no fixture errors. This was not an application authorization workaround. No security control was disabled.

## Reproduce without paid calls

From the feature checkout with Node 22 and existing installed dependencies:

```powershell
node --experimental-strip-types --test tests/pantry-plan-quantities.test.mjs tests/pantry-only-journey.test.mjs
```

For a browser review, use a checkout without hosted `.env*` files. First normal PowerShell terminal:

```powershell
$mcNode = 'C:\dev\tools\node-v22.22.0-win-x64\node.exe'
& $mcNode tests/fixtures/pantry-only-server.mjs
```

Second terminal, same checkout:

```powershell
$mcNode = 'C:\dev\tools\node-v22.22.0-win-x64\node.exe'
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:3053'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='local-test-anon-only'
$env:SUPABASE_SERVICE_ROLE_KEY='local-test-service-only'
$env:NEXT_PUBLIC_APP_URL='http://localhost:3052'
$env:OPENAI_API_KEY='mock-provider-no-paid-calls'
$env:OPENAI_BASE_URL='http://127.0.0.1:3053/openai/v1'
$env:BETA_PRODUCT_ACCESS_ENABLED='true'
$env:NEXT_TEST_WASM_DIR='.\node_modules\@next\swc-wasm-nodejs'
& $mcNode node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3052
```

Open `http://127.0.0.1:3053/fixture` in normal Chrome. Choose synthetic Plus → Plan → Pantry Only. Keep all actual restrictions; these identities have none. Generate, observe progress, reload, open Meals, select both options, inspect Shop/Cook, Save Week, reload. Then choose synthetic Free; verify owner isolation and a name-only Rice entry produces an actionable amount error before generation. Stop both terminals with Ctrl+C; all lab database state is disposable. The fixture has no upstream-fetch implementation, emails, signup or OAuth. Do not substitute real credentials.

## Remaining risks / approvals

- Stock verification is against the user's submitted snapshot, not physical inventory. Subsequent consumption/edits, meals chosen from other generations, or pre-existing weekly meals can change actual availability; Shop recalculates against the current selected week. Existing IMP-004 covers owner-approved future reconciliation after cooking. No automatic deduction is implemented.
- Pantry Only clients/jobs without measured inventory now need quantities before new generation. Existing saved content is untouched. Historical generated results are not retroactively certified as measured plans.
- This selector is conservative and deterministic, not a maximum-variety/subset optimizer. It rejects uncertain units instead of guessing. Cooking time, household yield and culinary practicality still require real-provider/human assessment; mocked recipes are engineering fixtures, not professional validation.
- Review the measured-stock policy, omitted-option behavior and Assignment 01 dependency before release. Then authorize a bounded hosted end-to-end test using a specific disposable/approved identity and a provider-call/spend bound. Real hosted queue delivery, provider availability and database configuration still need that evidence. No production merge, deployment, data/configuration changes or migration is performed by this assignment.
