# Assignment 02F — Pantry Only measurement contract

November 24, 2026, America/Chicago. PR18 only; PR17 remains released and unchanged.

## Confirmed defects and deterministic evidence

The earlier real response is unavailable; its exact incompatible ingredient has **not** been recovered. Code review instead confirmed contradictory Pantry Only guidance (`1 pinch`), no explicit snapshot-unit output contract, and stock validation after the existing correction opportunities. The old error suggested entering measurements even when the submitted inventory was already measured.

Using the original eleven-ingredient household-two fixture, deterministic tests reproduce:

| Generated measurement | Measured stock | Result before / after |
|---|---|---|
| Salt `1 pinch` | `4 tsp` | Rejected / still rejected, now `UNIT_UNSUPPORTED`; one mocked correction to `1/2 tsp` succeeds |
| Black pepper `1 package` | `2 tsp` | Rejected / still rejected with precise unsupported-unit reason |
| Garlic cloves `2 each` | `12 clove` | Rejected / still rejected; generic count cannot prove a clove measurement |
| Carrots `1 cup` | `8 each` | Rejected / still rejected; no vegetable-size conversion |
| Chickpeas `200 g` | `6 cup` | Rejected / still rejected; no density conversion |
| Salt `to taste` | `4 tsp` | Rejected / still rejected as invalid measured amount |
| Salt `1 tbsp` | `4 tsp` | Accepted / accepted using the existing same-volume conversion |
| Chickpeas `7 cup` | `6 cup` | Rejected / rejected as insufficient stock, without spending a measurement retry |

These are synthetic reproductions, not claims about the lost provider payload. New tests initially reported 3 passing / 7 failing assertions against the old code, including the missing correction and prompt contract. Existing compatible arithmetic already worked and remains intact.

## Smallest robust contract

Keep the existing persisted ingredient `{name, amount, price}` shape. Require `amount` to contain a positive decimal/fraction and canonical pantry unit, using the corresponding inventory name and preparation form. Prefer exact snapshot units; preserve legitimate same-dimension conversions. Seasonings can use fractions such as `1/8 tsp`, garlic uses `clove`, and whole vegetables use `each` when those are the supplied units. Explicitly prohibit pinches, packages, to-taste quantities, density guesses and raw/cooked or preparation-yield equivalence. The existing parser validates the grammar and the deterministic stock allocator remains authoritative.

Structured numeric quantity plus enumerated unit would remove string parsing ambiguity, but would require changes throughout model schemas, saved recipes, grocery parsing, replacement/recipe flows and legacy storage. It would not establish density or preparation yield. A strict canonical amount-string contract reuses tested parsing and is the smaller compatible correction; no database migration is required. No unrestricted normalization or new ingredient-equivalence rule was added.

## Validation and bounded correction

Quantity validation now runs before the first hard-constraint correction. If **no dinner survives** and a generated measurement is malformed, unsupported or dimensionally incompatible, include a targeted measurement instruction in that existing correction. At most **one** such instruction is issued. Count/schema/hard-constraint/measurement corrections share the unchanged **three-request maximum**; exhaustion never authorizes a fourth request. If earlier corrections exhaust the allowance, fail closed. Insufficient stock alone does not trigger a measurement retry. When valid dinners survive, retain those and omit invalid options without another call.

Every corrected plan still passes the original dietary/exclusion, available ingredient, explicit household serving, equipment, cooking-time and quantity checks. Partial deductions roll back for rejected dishes; all accepted dinners and treats share one stock ledger. No purchases or restock are introduced. Genuine restrictions remain blocked before any provider work.

Errors distinguish `PANTRY_MEASUREMENTS_INCOMPATIBLE` (generated amount/unit problem) from `PANTRY_QUANTITIES_UNSATISFIED` (insufficient/unmeasured available stock). Errors do not claim the pantry is empty or instruct users to remove dietary restrictions.

## Synthetic-only diagnostics

`fitPantryPlan` returns internal rejection records containing dish/ingredient indices, ingredient, requested amount/value/unit, available remaining amount/unit and a precise reason. These are not added to production API output, logs or telemetry. The owner-started local test launcher, after its strict synthetic owner/input authorization, records only projected ingredient measurement fields from bounded planning responses in `synthetic-measurements.json`; no raw response, recipe prose, credentials or real-user dietary input is retained. This is quantity diagnostic evidence, not application acceptance or culinary review.

Example from the fake fixture:

```json
{"ingredient":"Salt","requestedAmount":"1 pinch","requestedQuantity":1,"requestedUnit":"pinch","availableQuantity":4,"availableUnit":"tsp","reason":"UNIT_UNSUPPORTED"}
```

Known limits: first rejection per dish, at most seven dinner/two dessert diagnostic candidates and sixty ingredients per candidate; correction details are bounded to eight records. Production checks still validate the complete parsed plan. Unknown composition/preparation and culinary practicality remain unverifiable through unit arithmetic alone.

## Verification status

- Relevant generation/stock/provider regression group: 76 passed; additional safety, grocery and job/recovery group: 74 passed. Final contract group: 12 passed. Accounting for overlap, **141 distinct relevant tests**, all passing.
- TypeScript, targeted ESLint and `git diff --check`: passed.
- Normal `.next` production build: PASS, exit 0, 433 checked file hashes unchanged. Receipt: `C:\Users\hooks\Documents\Codex\assignment02f-owner-build.json`. Existing Browserslist-age and default Queue-region notices only; no dependency or configuration updates made.
- The normal-terminal read-only probe confirmed the previous helper and ports 3052/3053 inactive. Its stale armed receipt was preserved byte-for-byte in `assignment02f-pre-close-attempts.json` before closing only the consumed ledger; the one completed provider attempt and job binding are unchanged. The ledger is now **closed**. No provider or production connection was made during Assignment 02F.

IMP-006 remains on the proposed UX roadmap and in the improvement backlog; this assignment does not implement exploration-mode redesign. No hosted settings, production data, migrations, PR9 changes, merge or production deployment.

## Smallest later real-provider retest — not authorized here

After review, use a **new explicitly approved run**, never rearm the consumed run. Same synthetic Free owner, household two, eleven measured ingredients, Stovetop and Under 1 hour. One Generate action, at most **two planning attempts total** (initial plus one targeted correction), zero recipe calls for the first measurement gate; enforce this lower bound in that run's ledger before starting. Preserve input/output caps, default billing tier and freeze on uncertainty. No hosted environment is exercised. Review accepted quantities and purchase-free downstream navigation before separately deciding whether a Cook request is warranted. Any paid call requires owner authorization of the precise limits and estimated exposure; this assignment makes none.
