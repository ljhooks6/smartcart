# Assignment 02E — independent release and live-provider result

November 23, 2026, America/Chicago (November 24 UTC run timestamps).

## PR17: released independently

Reviewed head `cc2a5a5bf749c384f5b363bfe893f5a2d78e975c` against main `a0c8bf72df5430b1475e6802eb955776c182da5c`: six files, confined to dietary transport, fresh-form default and readable Review summary. Nonempty dietary values remain byte-for-byte intact; genuine restrictions, unknown/malformed information and saved preferences retain their protections. No server safety, authentication, billing, database or provider configuration changes.

79 relevant regression tests, TypeScript and targeted ESLint passed. The restricted build encountered Windows EPERM once; the owner's standard `.next` production build then passed with checked tracked-file hashes unchanged. Existing reviewed Preview was READY. PR17 merged through GitHub with the expected-head guard:

- Merge: `b72f8656b81516a68cfa30a98d48a03ba8436ab3`.
- Production: `dpl_DNsniJjrDfseCG6uzWPLaq9FagY8`, READY at that commit, serving `mealcaddie.app`.
- Deployment: https://smartcart-3gwulb065-ljhooks6s-projects.vercel.app .
- Previous rollback deployment retained privately: `dpl_2aMSkdmMzCkihEh3T7pN6mT2bf3R`, commit `a0c8bf72df5430b1475e6802eb955776c182da5c`. No rollback performed.

Non-mutating production checks passed for the public landing page, offline sample Plan/Shop/Cook, established sign-in options and anonymous denial at `/planner`. Signed-in customer content was not modified. No accounts, emails, production generation or database operations were performed. PR18 now targets main and remains draft and unmerged; PR9 is untouched.

## Local real-provider test: FAIL at stock validation

One owner-started run used a private existing testing key, synthetic Free identity, household two, Pantry Only, budget $60, Stovetop, Under 1 hour and the reviewed eleven-ingredient measured inventory. No optional meals or genuine dietary restrictions were removed. The local gate checked the actual owner-scoped input before provider dispatch. It preserves an input hash and the single job binding; it cannot authorize a different job.

Before any provider work, a fixture-only mismatch was corrected: the picker returns **Garlic cloves**, while the harness expected **Garlic**. The harness now uses the application's existing reviewed `pantryMatchKey`, retaining quantity, unit and stock equality. Its regression rejects garlic powder and altered stock. The previous empty-run receipt was retained; restarting was allowed only with zero attempts, a closed run and no bound job. This did not change application matching or dietary validation.

| Stage | Actual result |
|---|---|
| Browser request | PASS: one Generate click; Review showed unrestricted input, eleven ingredients, household two and the intended equipment/time |
| Reservation | PASS: one synthetic Free owner-scoped job, `reused:false` |
| Dispatch / worker | PASS locally: actual API/dispatcher/worker and PostgreSQL claim; not Vercel hosted Queue |
| Real provider | PASS transport: one `gpt-4.1` planning attempt, HTTP 200, 11.352 seconds |
| Usage | 3,285 prompt + 2,265 completion = 5,550 tokens; zero recipe attempts, failures at transport or uncertain attempts |
| Output validation | **FAIL:** `PANTRY_QUANTITIES_UNSATISFIED`; no complete dinner survived the compatible-unit check |
| Persistence | PASS for terminal failure: the actual disposable PostgreSQL job finished `failed`, with no accepted result |
| User feedback | PASS: visible, actionable unit/stock explanation; no invalid plan displayed |
| Accepted-result reload / Meals / scheduling / Shop / Cook | **NOT REACHED with real output**; earlier mock evidence does not replace this missing proof |

Provider request ID: `req_f6052402619e49ceaf61a037a6ea1003`.

At the recorded standard rates in the approved proposal, conservatively charging all prompt tokens without a cache discount gives **$0.02469** excluding tax. This is an estimate from reported usage, not an invoice or a verified provider-side spending cap. Only **1 of 5** permitted attempts was used; the maximum was a ceiling, not a target. No second job, manual retry or recipe request was submitted after rejection.

The exact incompatible ingredient and model-proposed unit are **not available**: the existing privacy-minimal receipts retain accepted synthetic results, not rejected model payloads. The generic conversion failure alone does not establish whether the model chose incompatible dimensions, used an unsupported spelling/preparation, or exposed a parser defect. No density, package-size or physical-size conversion was guessed to make the run pass. No accepted meal names, practical instructions or culinary quality can honestly be reported. All ten requested product-quality criteria remain unproven for this real response.

Sanitized evidence remains outside Git in the single run directory `assignment02d-runs/2026-11-24T03-04-52-177Z-0e1fadf6` under the owner's local Codex folder: `attempts.json`, `journey.json`, `validated-plans.json` and `pre-correction-empty-run.json`. Screenshots there in the parent Codex folder: `assignment02e-local-review.jpg`, `assignment02e-live-progress.jpg`, `assignment02e-live-validation-failure.jpg`; production evidence: `assignment02e-production.jpg`, `assignment02e-production-access.jpg`. No credential file was created. Assignment 02F subsequently verified helper shutdown and closed the stale consumed ledger after preserving its original bytes; see `docs/assignment02f-measurement-contract.md`. Do not restart the used run.

## Release recommendation and smallest next work

PR17's independent release is complete. **Hold PR18 in draft**: this live run demonstrates a practical reliability blocker even with measured stock; it does not establish successful meal quality or downstream usability.

Before another paid test, add narrowly scoped synthetic-only rejection evidence containing recipe/ingredient identity and required-versus-available units, without credentials or real-user payloads. Reproduce the exact mismatch deterministically, then correct the output contract/parser only if demonstrated necessary. Prefer requiring model quantities in compatible snapshot units; never invent density or raw/cooked equivalence. An actionable error should identify what requires review rather than implying that the user entered a package when the submitted inventory was measured. Any further paid run requires an explicit decision; do not rearm this consumed run.

Retain IMP-006 for the separately approved UX phase. Real hosted authentication, deployed RPC/RLS definitions, Queue delivery, shared quotas and hosted persistence remain unverified. No additional infrastructure, hosted configuration, production writes or PR18 release occurred.
