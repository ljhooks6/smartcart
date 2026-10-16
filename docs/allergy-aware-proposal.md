# Limited ingredient-source planning — working proposal

Base: production merge `b6909d07cb1808c5d427864d56aff8224059c2e3`. Isolated branch: `feature/allergy-aware-candidate`. This work does not include breakfast/lunch pausing or dessert-rotation changes. No production routes, existing dietary checks, account access, quotas, billing or saved records are changed. No shared migrations or services are required.

Next-pass assessment: [48-candidate expansion, qualified review, authenticated integration and four-source pilot plan](allergy-pilot-development-plan.md). That plan identifies unimplemented work and separate approvals; it does not enable any pilot or broaden this prototype's release status.

## What changed from PR #8

PR #8's disabled experiment used a small positive vocabulary and rejected all allergy menus in its paid evaluation. It detected conflicts, but expanding that vocabulary alone could not prove a sauce's subingredients or prevent free-form cooking steps from adding a food absent from the ingredient list.

This prototype reuses PR #8's structured dietary envelope, original/current restriction union and unchanged production guard. It adds a separate versioned generic-food catalog, exact-name resolver, positive source/alias detection, explicit homemade-component graphs and a server-owned recipe planner. Unknown names do not default to empty allergen lists. A model's food ID, `verified`, `safe`, `complete` or self-reported composition cannot establish approval. Neither a disclaimer nor model confidence changes the result.

There are **56 plain-food profiles**, **two complete homemade components**, and **18 authored recipes (14 dinners, four desserts)**. The registry and steps were prepared for engineering review; they are **not independently reviewed by an allergist/dietitian, manufacturer-verified, physically cooked or clinically tested**. “Reviewed recipe” in internal identifiers means a server-owned authored specification rather than arbitrary AI output. It must not be interpreted as medical endorsement.

The library provides a practical first pathway: choose recipe IDs from a constrained pool, then hydrate quantities, source checks, cooking steps and groceries on the server. AI could eventually propose IDs for variety, but it cannot alter composition or instructions. The current planner is deterministic and calls no model. Unconstrained AI recipe generation remains restricted.

## Exact checkable scope

| Input category | Prototype behavior |
|---|---|
| Structured food allergies | Check declared sources for Milk, Eggs, Fish, Crustacean shellfish, Tree nuts, Peanuts, Wheat, Soy and Sesame in the fixed catalog/recipes. Multiple selections form a union. This is not proof of absence in purchased food. |
| Lactose intolerance | Remains a distinct intolerance. A conservative strategy excludes all cataloged milk sources; it does not quantify lactose, infer an individual tolerance or invent a milk allergy. |
| Other intolerances / medical diets | Unsupported; no histamine/FODMAP/renal/nutrient-threshold or treatment suitability claim. |
| Ordinary preferences | Vegetarian and Vegan ingredient selection supported in this isolated engine. Religious certification, nutrient targets and gluten/celiac suitability are not inferred from ordinary preference labels. Existing production preference behavior is unchanged. |
| Ingredient avoidance | Exact plain catalog ingredients, including an explicit “no mushrooms,” are excluded separately. This is not allergy consent or medical enforcement. Unknown terms require clarification. |
| Free-text / custom allergies | Preserve text; recognized legacy allergy words prompt explicit confirmation in structured controls. Ambiguous “nut-free,” broad “shellfish,” custom allergies and unclassified entries stay restricted. Never ask users to remove a genuine restriction. |
| Packaged/composite foods | Generic stock, pesto, soy sauce, chocolate, tortillas, non-dairy substitutes, spice blends and unknown/brand-specific formulations are unresolved. An ingredient being common does not make its formulation known. |
| Homemade components | Only the exact server-owned lemon-parsley dressing and tomato-garlic sauce, recursively expanded into their declared plain ingredients. A caller cannot approve “pesto” by claiming it contains only basil. |
| Refined oils / derivatives | No clinical or regulatory-exemption shortcuts. Known derivatives are conservatively detected; unknown formulations remain unresolved. |
| Cross-contact / manufacturing | Unverifiable, as are actual labels, substitutions in the kitchen, restaurant practices and regional formulations. No severity-based relaxation or “may contain” clearance. |

Source patterns cover caseinates, non-animal casein/whey, goat/sheep milk, non-chicken bird eggs, groundnuts/arachis, prawns/krill, tofu/tamari, semolina/spelt and tahini/benne/gingelly. Unknown foreign names or novel compounds fail exact resolution rather than being assumed compatible. Cocoa butter is not classified as milk merely because of the word butter; an unresolved product still cannot pass as a reviewed formulation. No tree-nut selection is automatically expanded to all foods containing “nut”; custom coconut allergy remains unsupported, not dismissed.

## Reference data and its limits

The source ontology was checked on **October 16, 2026** against [FDA's current allergen-labeling guidance FAQ](https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information/frequently-asked-questions-food-allergen-labeling-guidance-industry). That guidance includes ruminant milk and eggs from other birds and revised tree-nut classification. FDA does not certify these recipes or catalog records. A record's `reference` indicates the source ontology, not an FDA product determination.

Alias and hidden-source checks also use [FARE milk guidance](https://www.foodallergy.org/living-food-allergy/food-allergy-essentials/common-allergens/milk), [sesame guidance](https://www.foodallergy.org/living-food-allergy/food-allergy-essentials/common-allergens/sesame) and [soy guidance](https://www.foodallergy.org/living-food-allergy/food-allergy-essentials/common-allergens/soy). These support source detection, not completeness of a manufacturer's recipe. Their online wording can change; version changes need review and regression fixtures.

[FDA label-reading guidance](https://www.fda.gov/consumers/consumer-updates/have-food-allergies-read-label) supports checking the actual product and resolving uncertainties with its manufacturer. Absence of a declared source or an advisory statement in our generic catalog is not evidence about cross-contact. [USDA FoodData Central's API](https://fdc.nal.usda.gov/api-guide/) was investigated as a possible generic/branded ingredient source; nutrition records and ingredient text would not provide complete allergy or cross-contact verification. No service, key, purchase, automated product scraping or external data integration was added.

Cooking thermometer values reference the [FoodSafety.gov minimum temperature chart](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures). Meeting a cooking temperature does not remove an allergen. Recipe timing, yield and taste still require practical review.

## Working behavior and actual examples

See [full quantities and steps](../evals/allergy-aware-results.json) and the [authored recipe registry](../lib/allergy-aware-recipes.ts).

| Candidate / operation | Result | Reason |
|---|---|---|
| Lemon chicken, potato wedges, broccoli; Milk + Sesame selected | Accepted in the prototype | Exact plain chicken/vegetable identities and the complete oil/lemon/parsley/salt dressing are known in this recipe specification. Actual products and cross-contact remain unchecked. |
| Chickpea-tomato stew with rice | Accepted | Sauce expands to tomato, onion, garlic, oregano, oil and salt. Plain cooked chickpeas are specified; an unspecified canned product is not silently substituted. |
| Blueberry oat crisp with Milk + Sesame excluded | Accepted | The declared recipe uses oats, berries, oil, sugar, cinnamon and water. This makes no gluten-free claim. |
| Tahini replacing the lemon dressing with Sesame selected | Rejected conflict | Sesame source detected, even if presented as a “healthy” substitution. |
| Milk, sodium caseinate, goat milk or lactose-free milk with Milk selected | Rejected conflict | Known milk source; lactose-free is not a milk-protein exclusion. |
| Chicken stock / pesto / chocolate mix / unknown bottled sauce | Unresolved; not released | Full formulation cannot be established from the name or model text. |
| New garnish or secret powder only in AI steps | Not released | Free-form instructions have no authoritative ingredient binding. Locked server-owned steps are required. |
| Grocery transform inserts milk, drops rice, changes quantities/units or adds a sauce | Rejected | Recomputed requirements and current+original restrictions must match after transformation. |
| Old saved recipe without a current-version specification | Requires review | Preserve it, but do not relabel it checked. No historical rewrite or deletion. |

Allergen-conflicting and unknown pantry entries are **quarantined from selection and pantry credits**, with an explanation; pantry data is never removed. Pantry-only mode requires sufficient declared quantities in canonical units for the complete selected plan. It does not infer quantities from a pantry name. Water is the sole explicit always-available planning assumption. Ordinary mode generates only the shortage list. Budget, household size, time, equipment, dessert inclusion and unique recipe counts remain hard constraints; infeasibility returns an actionable error rather than relaxing an exclusion or silently adding a paid retry.

Saved snapshots retain original dietary settings and source-catalog version. Reopening, replacing, regenerating and grocery transformation recompute from the server-owned specification under current **and** original restrictions. Changed versions and unreadable history require review. No caller-provided safe status is restored. The prototype never writes a snapshot to shared storage.

## Evidence, not safety certification

Run:

```powershell
node --experimental-strip-types --test tests/allergy-aware.test.mjs
node scripts/evaluate-allergy-aware.mjs evals/allergy-aware-results.json <private-original-evaluation-json>
```

- 24 realistic planning scenarios: **16 accepted, eight expected rejections** (custom/medical/gluten/ambiguous entries or unattainable constraints). These are authored scenarios, not patient trials.
- 18 hidden-source, composite, restock, grocery, instruction, missing-data and adversarial drafts blocked.
- All **511 nonempty combinations** of the nine source selections can produce seven distinct dinner specifications under the test budget/equipment/time. This measures the engineering pool and restrictions, not allergy risk, nutrition adequacy or model accuracy.
- Offline replay uses **50 distinct parsed provider responses** from the previous paid synthetic evaluation (not 50 new calls). The retained record includes six distinct allergy-targeted responses spanning four case/tier requests. These remain non-release-eligible; known conflicts or unresolved content are retained, not sanitized away.
- A new deterministic reviewed-recipe plan is feasible for each of those four original allergy scenarios under its declared source exclusions, budget, household, time and equipment. This is **not a corrected AI response or independent model benchmark**. The original unconstrained outputs did not become safe.
- Exact resolution covers 2,735 of 3,381 ingredient entries in the entire offline corpus. Remaining names and their frequencies are retained. Butter, soy sauce, unspecified beans/flour and other unresolved products were not whitelisted simply to improve the score. The ambiguous “lemon juice” alias was removed rather than implying bottled juice has known composition.
- No new provider calls, paid evaluation, customer information, live generation, account changes or external email.

The original raw evaluation remains private with a SHA-256 reference; tracked results contain synthetic dishes, engineering findings and compact examples. No private keys or customer content are included.

Final validation: **328 tests passed**, including 54 new allergy-aware tests (one exercises all 511 combinations). TypeScript, lint and production build passed. A local production-build rehearsal returned **404** for both new lab routes even with the experimental flags set. The existing production allergy guard, candidate, provider routes, membership and migrations are unchanged.

Actual Chrome review at 390px and 320px verified generation, seven dinners plus a dessert under all nine exclusions, keyboard disclosure, result-heading focus, explicit tahini conflict, unresolved stock and an unsupported gluten request. No horizontal overflow was observed; the viewport was restored. Native NVDA/VoiceOver/TalkBack, physical-device testing and physical cooking are separate dependencies. Local API testing caught and corrected Next dev's normalization of `127.0.0.1` to `localhost`; only loopback aliases on the same protocol/port are accepted and external origins remain denied.

## Local review surface

Set `MEALCADDIE_ALLERGY_LAB=true` only in the local development process, start Next on localhost, then visit `/labs/allergy-aware`. The page and `/api/labs/allergy-aware` return 404 in Production and hosted Preview, irrespective of the lab flag. The API also rejects non-local hostnames and cross-origin requests. Production builds do not expose an active laboratory. The new branch's automatic Vercel deployment is disabled before pushing. The previous candidate flag and production restriction are unchanged.

The local form demonstrates ingredient-source checks, conflict/uncertainty messages, fixed steps, groceries, intolerance separation, ordinary preference and infeasibility. It uses synthetic examples and no account/provider credentials. Do not enter personal medical details.

Messages avoid a “safe” badge:

- **Checked:** “Declared ingredient sources checked against the selected exclusions.” Always describe unverified physical-product factors.
- **Conflict:** “Sesame: Tahini. This ingredient is excluded from this plan.”
- **Uncertain:** “Composition unresolved: Chicken stock. Use a cataloged plain ingredient or the exact server-owned homemade component.”
- **Unsupported:** “Clarify the original entry … Keep genuine restrictions entered.”
- **Insufficient coverage:** “There are not enough reviewed recipes for these restrictions and planning limits.” No forced fallback or extra model retry.

## Recommendation and required next approval

Do **not** lift production allergy-dependent generation yet. The practical initial candidate is **a separately labeled reviewed-recipe source-exclusion mode**, first evaluated in a small supervised pilot for explicit Milk, Eggs, Peanuts and Sesame selections. All nine sources already have engineering tests; expansion of the pilot to other groups requires the same review, not an assumption of certification.

Before any hosted pilot or production proposal:

1. Qualified food-allergy/dietetic review of the complete catalog, alias assumptions, recipes, quantities and copy; practical cooking checks. No unapproved review expense is authorized.
2. Owner approval of the limited menu-based experience and supported categories. Do not describe this as unconstrained personalized AI allergy generation.
3. A separately reviewed server adapter behind existing account/entitlement/quota authorization. Load original restrictions and recipe snapshots from ownership-verified stored records, **not client assertions**. Revalidate queued jobs, cached results, replacements and all shopping transformations before release. These current production flows are unchanged and remain restricted; this prototype does not claim to have enabled them.
4. Show current ingredient evidence and unresolved actual-product checks in Cook/Vault; no stale “checked” badge. Tie revisions to catalog/specification versions and preserve existing records without automatic conversion.
5. Review real device and NVDA/VoiceOver/TalkBack behavior, draft exact environment scope and rollback, then obtain separate hosted pilot/deployment/activation approval. No database migration is presently needed; any later migration still needs review.

Rollback during local review is simply stop the local process/remove the isolated branch. No shared state exists to restore. Future activation must keep an immediate fail-closed server kill switch; disabling the mode must preserve all saved content and must not roll back production allergy protections.

Further dependencies are tracked separately in [improvement-backlog.md](improvement-backlog.md); IMP-001 remains open. No independent breakfast/lunch or dessert-rotation release is blocked on this experiment.
