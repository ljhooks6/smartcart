# Assignment 02G — real-provider measurement verification

November 24, 2026, America/Chicago. Application under test: PR18 at 20a3de63b6ebfdb1547ad8bb18f1523eedcb8846. Only local harness changes were made for this assignment. No application, dietary guard, entitlement, migration or production configuration changes; PR17 remains released, PR18 remains draft/unmerged, PR9 and other applications untouched.

**Measurement gate PASS. Complete Pantry Only experience FAIL. Hold PR18.**

## Verification stages

| Stage | Result | Actual evidence |
|---|---|---|
| Reduced budget | PASS | Durable 2 planning / 0 recipe / 2 total profile. Third planning and every recipe denied before dispatch, including reopened ledgers |
| Accounting/security controls | PASS | 25 focused mocked tests passed: failures consume permits, pending/uncertain outcomes freeze, owner/input/job bindings and existing token limits preserved |
| Previous ledger | PASS | Remained closed; original SHA-256 unchanged: 0ad6b1963a27da610287f8cb535d7e6a27c7f86b1982fc571bcece4b1a581173 |
| Dietary payload | PASS | UI No preference; strict synthetic scope gate checked empty parsed restrictions and bound actual input hash; no genuine restriction removed |
| Request/reservation | PASS | One Generate action, one synthetic Free owner-scoped job, reused:false |
| Dispatch/worker | PASS locally | Actual API/dispatcher/worker and disposable PostgreSQL reservation/claim/finish; not hosted Vercel Queue/Auth |
| Real provider | PASS | One GPT-4.1 HTTP 200 response in 11.712 seconds; no correction required |
| Compatible measurements | PASS | Six accepted dinners replayed with zero quantity rejections |
| Cumulative stock | PASS | All six fit the unchanged eleven-entry measured snapshot; independent totals below |
| Household/time | PASS for declared values | All serve two, 35–50 minutes within 60. Physical portions and feasibility for unspecified preparation forms NOT TESTED |
| Equipment | PASS for plan validation | Passed selected Stovetop constraints; actual cooking instructions NOT TESTED |
| Required ingredients/purchases | PASS | Only original pantry identities, all prices zero, no restock or required purchase |
| Optional food prose | FAIL | Skillet suggests unlisted optional salad; stew/ragout suggest rice without allocating its quantity in those dinners |
| Result persistence/reload | PASS | Completed PostgreSQL result hash unchanged; one reservation and no repeat provider work |
| Meals/scheduling | PASS locally | Six options rendered; two selected; occupied days displayed; explicit swap and Save/reload preserved Monday/Tuesday assignments |
| Purchase-free Shop before reload | PASS locally | Selected two dinners: eleven covered rows, $0 to buy, combined quantities attributed to each meal |
| Purchase-free Shop after reload | FAIL | Free pantry becomes empty; same saved meals show eleven items to buy, including water |
| Cook/recipe | NOT TESTED | View Recipe never clicked; enforced allowance zero |
| Cleanup | PASS | Normal owner-assisted process/port probe: helper stopped, ports 3052/3053 inactive, new ledger closed, old ledger unchanged |

## Requests, tokens and spending

[OpenAI GPT-4.1 documentation](https://developers.openai.com/api/docs/models/gpt-4.1), checked November 24: $2/million input, $0.50/million cached input, $8/million output; 1,047,576-token context. No cached-input discount assumed. Default tier, text-only, no tools or SDK/proxy retries. The 32,768-byte input bound is not an exact token count.

Conservative pre-call estimate: 2 × (1,047,576 × $2/1M + 4,096 × $8/1M) = **$4.25584 excluding tax**, below the approved $5. This deliberately overbudgets with the full model context plus the enforced output limit; it is not a provider-account spending cap.

Actual: **one planning attempt, zero correction requests, zero recipe attempts, zero uncertain/failed provider attempts**. Serialized message input 17,227 bytes. Reported **3,496 prompt + 2,342 completion = 5,838 tokens**. Estimated uncached-rate charge **$0.025728 excluding tax**, not an invoice. Unused allowance was not consumed merely to reach a limit.

Job 850cac94-f335-44b0-900a-cde28e60d38e. Provider request req_89d40634032a4fcca11eb39c25cbd993. Bound input hash 4332ec6a735c9cc3a4ba9374f379459999b64468cac01e9a4c0dba2df54214d2. Result receipt SHA-256 before/after reload eddc776cbbe7e57a8bc6711f988efb5883c98457380621344a273dbd1dead6ef.

## Actual accepted meals, descriptions and quantities

These are actual AI-generated candidates, not physically cooked, professionally reviewed or allergen-safe recipes. Amounts are for the whole dinner, not per person.

1. **Black Bean and Rice Skillet — 40 min, serves 2.** A hearty skillet meal of tender black beans and fluffy rice simmered with sautéed onions, garlic, tomatoes, and carrots for a comforting, one-pan dinner.

   Quantities for the whole dinner: Rice 1 cup; Black beans 1 cup; Onions 1 each; Garlic cloves 2 clove; Tomatoes 1 each; Carrots 1 each; Olive oil 1 tbsp; Salt 0.5 tsp; Black pepper 0.25 tsp; Water 2 cup.

   Model note: Balanced and filling; pairs well with a simple side salad if desired.

2. **Chickpea Tomato Stew — 45 min, serves 2.** A warming stew of chickpeas simmered with fresh tomatoes, onions, garlic, and carrots, seasoned with olive oil, salt, and black pepper for a simple but satisfying meal.

   Quantities for the whole dinner: Chickpeas 1 cup; Tomatoes 2 each; Onions 1 each; Carrots 1 each; Garlic cloves 2 clove; Olive oil 1 tbsp; Salt 0.5 tsp; Black pepper 0.25 tsp; Water 1.5 cup.

   Model note: Serve with a scoop of rice or enjoy as a hearty bowl.

3. **Vegetable Chickpea Stir-Fry — 35 min, serves 2.** Chickpeas sautéed with carrots, onions, tomatoes, and garlic in olive oil, served over rice for a quick and colorful stir-fry with a Mediterranean flair.

   Quantities for the whole dinner: Chickpeas 1 cup; Rice 1 cup; Carrots 1 each; Onions 1 each; Tomatoes 1 each; Garlic cloves 2 clove; Olive oil 1 tbsp; Salt 0.5 tsp; Black pepper 0.25 tsp; Water 2 cup.

   Model note: A great way to use up vegetables and add variety.

4. **Simple Bean and Vegetable Soup — 50 min, serves 2.** A comforting soup featuring black beans, carrots, onions, tomatoes, and garlic simmered together with rice for a wholesome, filling meal.

   Quantities for the whole dinner: Black beans 1 cup; Rice 0.5 cup; Carrots 2 each; Onions 1 each; Tomatoes 1 each; Garlic cloves 2 clove; Olive oil 1 tbsp; Salt 0.5 tsp; Black pepper 0.25 tsp; Water 3 cup.

   Model note: Perfect for a lighter dinner that still satisfies.

5. **Chickpea and Carrot Rice Pilaf — 40 min, serves 2.** A fragrant pilaf of rice, chickpeas, carrots, onions, and garlic, all cooked together and finished with a drizzle of olive oil for a satisfying, subtly sweet dinner.

   Quantities for the whole dinner: Rice 1 cup; Chickpeas 1 cup; Carrots 1 each; Onions 1 each; Garlic cloves 2 clove; Olive oil 1 tbsp; Salt 0.5 tsp; Black pepper 0.25 tsp; Water 2 cup.

   Model note: Easy to prepare and great for leftovers.

6. **Hearty Tomato and Bean Ragout — 45 min, serves 2.** A rustic ragout of black beans and chickpeas braised with tomatoes, onions, garlic, and carrots, finished with olive oil for a rich and savory stew.

   Quantities for the whole dinner: Black beans 0.5 cup; Chickpeas 0.5 cup; Tomatoes 1 each; Onions 1 each; Carrots 1 each; Garlic cloves 2 clove; Olive oil 1 tbsp; Salt 0.5 tsp; Black pepper 0.25 tsp; Water 1.5 cup.

   Model note: Serve with rice or enjoy as a thick stew.

## Product-quality review

| Dinner | Review |
|---|---|
| Black Bean and Rice Skillet | Recognizable one-pan meal. Rice/water pairing plausible for some uncooked rice, but variety and bean form are unknown. Optional salad lies outside the fixture. |
| Chickpea Tomato Stew | Recognizable vegetable-legume stew; chickpea readiness unresolved. Optional rice has no measured allocation here. |
| Vegetable Chickpea Stir-Fry | Recognizable sauté/rice combination; readiness unresolved and strongly overlaps skillet/pilaf ingredients. |
| Simple Bean and Vegetable Soup | Recognizable soup; declared amounts check, physical yield and bean preparation do not. Similar base to stew/ragout. |
| Chickpea and Carrot Rice Pilaf | Distinct rice format with the same base ingredients; actual technique, rice form and chickpea readiness unverified. |
| Hearty Tomato and Bean Ragout | One cup total legumes for two plus vegetables could be a lighter dinner; no nutrition/yield proof. Optional rice needs allocation. |

**Preparation-form gate unresolved:** the original fixture says Rice, Black beans and Chickpeas, not dry/canned/cooked or drained. The picker groups legumes under Canned & Jarred, but that category is not an authoritative request field establishing preparation form. Descriptions plausibly depend on ready-to-use legumes; that is an inference, not a confirmed instruction or proof of the model's assumption. No raw/cooked conversion was authorized, and the fixture was not changed. Actual cooking feasibility, yield and portion adequacy are **NOT ESTABLISHED**. Unit compatibility alone does not settle these questions.

Variety is limited: six recognizable bean/rice/vegetable variations with substantial ingredient overlap, not a strongly varied weekly menu. No fried rice was returned. The unchanged constrained pantry may reasonably limit variety; no extra call was made to improve it. Optional side prose is not an extra required purchase, but it escapes the measured plan and should be removed or explicitly quantified before a confirmed pantry-only experience is claimed.

## Combined stock for all six accepted dinners

| Ingredient | Available | Required | Remaining |
|---|---:|---:|---:|
| Rice | 8 cup | 3.5 cup | 4.5 cup |
| Black beans | 6 cup | 2.5 cup | 3.5 cup |
| Chickpeas | 6 cup | 3.5 cup | 2.5 cup |
| Carrots | 8 each | 7 each | 1 each |
| Onions | 6 each | 6 each | 0 each |
| Tomatoes | 6 each | 6 each | 0 each |
| Garlic | 12 clove | 12 clove | 0 clove |
| Olive oil | 16 tbsp | 6 tbsp | 10 tbsp |
| Salt | 4 tsp | 3 tsp | 1 tsp |
| Black pepper | 2 tsp | 1.5 tsp | 0.5 tsp |
| Water | 24 cup | 12 cup | 12 cup |

Offline replay against the original snapshot: zero rejections, eleven covered rows, zero purchases and zero unresolved pantry checks. The raw-response measurement projection separately checked seven candidates and reported an additional Onions 1 each against 0 remaining (STOCK_INSUFFICIENT). It is diagnostic evidence, not proof of which normalization/deduplication step removed that candidate. The application accepted six distinct fitting dinners.

A minimal synthetic probe appended after the six accepted dinners reproduced the exact onion amount/unit, remaining stock and rejection reason from that diagnostic. It reconstructs the quantity failure only, not the original seventh recipe or the earlier Assignment 02E response.

## Confirmed reload issue and next work

In components/smart-cart-app.fixed.tsx, canPersistPantryMemory = isPlusMember; the restore effect selects [] for Free. This explains the observed reset. Two selected dinners and the swapped schedule survive, but current pantry coverage does not. Do not fix this by granting Plus or assuming an old snapshot proves current sufficiency. Review owner-scoped current-device/per-plan quantity recovery with a timestamp and explicit stale-stock confirmation, separate from Plus cloud memory. This decision is recorded as IMP-007; retain IMP-006's broader exploration proposal.

Require explicit preparation forms for ambiguous staples and keep side suggestions inside measured/quantified pantry content. These are remaining corrections, not permission to alter the fixture, infer yields or weaken validation. No application fix was made during this verification assignment.

**Recommendation: HOLD PR18** for the reload and preparation-form/practicality gaps and owner review. A separate bounded Cook/recipe test is necessary before claiming end-to-end cooking usability: actual instructions, ingredient/form/quantity preservation, doneness guidance, equipment and elapsed time were not exercised. Do not spend the closed run's unused allowance or start another run automatically.

## Evidence and cleanup

Private synthetic run: C:\Users\hooks\Documents\Codex\assignment02d-runs\2026-11-24T20-11-23-750Z-3f782802. Contains attempts.json, journey.json, validated-plans.json, synthetic-measurements.json. Other receipts in the parent Codex folder: assignment02g-preflight.json, assignment02g-before-reload.json, assignment02g-stock-review.json, assignment02g-cleanup.json, assignment02g-harness-tests.log.

Screenshots in C:\Users\hooks\Documents\Codex: assignment02g-review.jpg, assignment02g-progress.jpg, assignment02g-meals.jpg, assignment02g-shop.jpg, assignment02g-schedule.jpg, assignment02g-reload-shop-defect.jpg, assignment02g-reload-week.jpg. All contain synthetic content only, no private key. The fixture page's old five-attempt label was a display error; actual enforcement was two/zero/two throughout.

Cleanup PASS: helper/listeners absent, new ledger closed with one planning/zero recipe, previous ledger hash unchanged. No credential file was written; owner process ended. **Local real-provider evidence is not hosted end-to-end verification.** Hosted Supabase Auth/RPC/RLS, Vercel Queue, deployed credentials and hosted persistence remain unverified. No production data, schema, billing, infrastructure or hosted setting changed.
