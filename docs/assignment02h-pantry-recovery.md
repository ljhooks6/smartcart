# Assignment 02H — active-plan pantry recovery and quantified cooking

Candidate changes on draft PR #18, based on bb8efb0. No paid provider requests, hosted configuration changes, production data, migrations, entitlement changes or PR #9 changes. IMP-006 remains the separate, unimplemented exploration UX initiative.

## Confirmed causes and implementation

- Free pantry restoration was gated by Plus, while saved meals restored independently. Missing quantities then became purchases. An owner- and plan-bound current-device record now stores only ingredients needed by the active Pantry Only plan. Free Save Week continues to send `pantry: null`; Plus reusable cloud pantry behavior and database enforcement are unchanged. Extra Free pantry additions remain session-only.
- The original generation snapshot, timestamp and job ID stay separate from current edits. Reopening requires explicit current-stock confirmation. Missing, stale, incompatible or insufficient inventory holds shopping and cooking for review rather than fabricating purchases or certifying sufficiency. Marking a Pantry Only meal cooked also invalidates confirmation; consumption is not guessed or automatically deducted. Explicit workspace reset clears the active record.
- Ingredient names now carry explicitly chosen preparation forms through existing inventory/recipe JSON. Generic rice, common beans and chickpeas require clarification; choosing a form clears quantity for remeasurement. Dry/cooked, canned/drained and package yields are never converted. Dried legumes remain unsupported by the initial cooking contract: prepare separately and enter actual cooked quantities. Picker categories do not establish form.
- Free-text recipe steps could pass the old guard while introducing an unlisted food, changing an amount or changing preparation form. Three deterministic probes reproduced this without a provider call. With owner approval, Pantry Only uses a strict action/reference schema and server-rendered text referencing only the validated ingredient list. Unsupported IDs, extra prose/fields, missing ingredients, unresolved forms, equipment and elapsed-time violations are rejected. Existing dietary and food-safety guards still run. Ordinary recipe generation and legacy ordinary cache keys remain unchanged.
- Pantry Only meal titles/descriptions/notes are rendered from validated ingredient names and a limited dish-style vocabulary. Optional unquantified side/sauce suggestions are not carried into the confirmed output. Selected desserts share stock checks and retain plan metadata in Save/Vault/Cook conversions.
- Individual Pantry Only replacements stop with a whole-plan regeneration instruction. They cannot silently change a previously allocated stock ledger; ordinary replacements remain supported.

## Evidence and verification

The historical six-dinner response from Assignment 02G is preserved unchanged in `tests/fixtures/pantry-six-dinners.json`. New tests explicitly and separately declare Dry white rice, Cooked black beans and Cooked chickpeas. This is a clarified **mock replay**, not a recovered claim about the original model's preparation assumptions or a new real-provider test.

| Check | Result |
|---|---|
| Relevant regression suite | PASS: 129 tests, including stock/measurement, generation API/jobs, grocery, shopping progress, Save/recovery, picker, direct storage entitlements and unchanged production allergy guards |
| New recovery/contract cases | PASS: immutable snapshot/current edits, restart and owner/plan isolation, reconfirmation, storage failure, replacement/reset, explicit forms, metadata, structured-action rejection and exact recipe ingredients |
| Actual SDK/worker/PostgreSQL bridge | PASS with fake upstream responses: scoped reservation, persistence, terminal-job redelivery and shared planning/recipe budget |
| TypeScript and focused ESLint | PASS |
| Standard `.next` production build | PASS in owner-started normal Windows terminal; 441 source-file hashes match before/after |
| Actual browser verification | INCOMPLETE: initial Free missing-record protection and explicit reset were observed. Reconnection later listed the local Chrome tab, but both accessibility and DOM reads timed out. Do not count the remaining recovery/quantity/navigation checks as passed. |

Local evidence outside Git: `C:\Users\hooks\Documents\Codex\assignment02h-regression-final.log`, `assignment02h-types-final.log`, `assignment02h-lint-final.log`, and `assignment02h-lab\build-receipt.json`. Initial 390px missing-stock screenshot: `assignment02h-missing-stock-390.jpg`. The prior before-reload defect screenshot remains `assignment02g-reload-shop-defect.jpg`. No production customer records are present in these fixtures.

## Remaining verification and limitations

Keep PR #18 draft and hold release. Finish actual Free generation/selection/Save/reload/reconfirmation, changed amounts, Plus cloud persistence and synthetic expiration, account switching/sign-out, and Meals/Week/Shop/Cook navigation in the owner-started local lab. Test 320px and 390px layouts and keyboard focus when a preparation-form rename remounts its quantity editor. Browser restart and storage-failure coverage currently comes from focused tests, not a physical browser restart.

Local fixtures verify client/API/worker behavior with disposable PostgreSQL and synthetic Auth/storage responses. They do not prove hosted Supabase Auth/RLS or Vercel Queue delivery. Historical meals lacking authoritative Pantry Only provenance/forms are not retroactively certified; a newly validated plan may be required. Current-device local storage is recoverable only while that browser's data remains available and is not an encrypted vault against another person using the same Windows/browser profile.

The limited action grammar prevents unlisted foods and amount/form substitutions; it is **not** physical cooking validation, a nutrition/yield guarantee, professionally reviewed instructions or allergen-safety certification. Dry-rice timed simmer checks are conservative engineering rules; adequate hydration, technique and practical portions still need recipe review. Other grains and preparation-sensitive products beyond this limited clarification set are not generally certified.

## Smallest proposed real Cook verification — not authorized or executed

After the offline browser gate and owner review, propose one separate local session with the accepted six-dinner replay, explicitly reconfirmed inventory and one selected dinner. Zero planning calls; one initial structured Cook request and at most one correction, two recipe attempts total, durable accounting and freeze-on-uncertainty. Recalculate current model/token exposure before requesting paid-call authorization. Inspect ingredient allocation, preparation sequence, water/rice handling, portions, time, equipment and cache/reload behavior. Stop on an impractical result rather than treating schema validity as product quality. No hosted or production claim follows from this local test.
