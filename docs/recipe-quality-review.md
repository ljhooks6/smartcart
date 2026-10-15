# Recipe quality and dietary candidate review

Production baseline: `9fc354f17645d2e3aea44123f74960fbda3ab81a`. Development only: `feature/recipe-quality-dietary-controls`. No production deployment, shared migration, account edits, invitations, emails or billing changes.

## Causes and changes

- Conflicting directives forced side dishes into titles, three aromatics into every dinner, and rigid protein variety even when constraints limited choices. Descriptions and cooking text shared `notes`. Revised prompts prioritize coherent dishes, fitting sauces/textures, attainable variety and finished-dish descriptions. Pantry and other hard constraints outrank novelty.
- Free-text substring matching rejected `ham` inside `shawarma`. Whole-term matching now preserves real excluded-food detection without that false positive. Equipment checks now distinguish explicit negative statements such as “requires no blender” from a positive blender requirement elsewhere in the same recipe. Allergy matching does **not** use this equipment-negation rule.
- New generation carries optional `description` separately from `notes`; saved JSON preserves it and original dietary settings. Historical instructions and recipes are not rewritten. Show Details prefers a usable finished-dish description, falls back to a usable historical description, otherwise explains that none was saved. Full recipe steps remain separate.
- General mobile safety information now sits near planning controls, with contextual recipe review and prominent actual conflicts. The full safety notice remains linked. Ordinary preferences do not cause a repeated large uncertainty panel on unrelated tabs.
- Dessert prompts broaden the repertoire and require ingredients supporting named components. Desserts now count toward the server budget check. Whole-plan checks also cover optional meals, restock, pantry-only availability, household servings, named components and selected time limits. General estimates are not local quotes or guaranteed checkout costs.
- Replacement requests now carry pantry-only mode and independently validate availability. Current and stored original dietary restrictions are combined for recipe regeneration, rather than silently losing the original entry.
- Models, reasoning settings, SDK retries and the three-call weekly-generation ceiling are unchanged. Within that ceiling, malformed schemas can receive a correction; an unused final slot may repair remaining hard constraints. This can use more calls for a defective individual response, so consumption is measured below rather than assumed unchanged. Plus retains its existing additional refinement role. There is no new unbounded retry loop.

## Reproducible evaluation and limits

The owner approved a $15 maximum. Ten fixed cases × Free/Plus × baseline/candidate = **40 unique menu runs**. See [cases/rubric](../evals/recipe-quality-cases.mjs), [runner](../scripts/evaluate-recipe-quality.mjs) and [complete compact results](../evals/recipe-quality-summary.json). Existing model choices and reasoning were used; evaluation output was capped at 6,000 tokens, so this is not an unlimited production-throughput benchmark.

Candidate responses were collected during implementation. Discovered defects were corrected, then **all twenty candidate datasets were replayed through the final validators**. Four additional corrections used only remaining slots within each original three-call menu ceiling. This was not a fresh independent final-head sampling run; initial and rejected outputs were retained. Total: **51 real provider calls**, estimated **$1.598234** from reported token usage and standard model rates, not an invoice. No additional paid judge model was used. Raw synthetic responses, correction history and their digest are retained privately; no customer data or credentials are in the tracked results.

| Case | Baseline Free / Plus | Final validation Free / Plus |
|---|---|---|
| Two adults, $60 | Rejected / Accepted | Accepted / Accepted |
| Adventurous, $100 | Accepted / Accepted | Accepted / Accepted |
| Family of four, familiar | Accepted / Accepted | Accepted / Accepted |
| Limited equipment | Accepted / Accepted | Accepted / Accepted |
| Short preparation | Accepted / Accepted | Accepted / Accepted |
| Pantry only | Accepted / Accepted | Accepted / Accepted |
| Vegetarian | Accepted / Accepted | Accepted / Accepted |
| Common selected allergen | Restricted / Restricted | Restricted / Restricted |
| Multiple selected allergens | Restricted / Restricted | Restricted / Restricted |
| Dessert inclusive | Accepted / Accepted | Accepted / Accepted |

The ordinary-case acceptance count changed from **15/16 to 16/16**; all four dietary experiments remained fail-closed on unresolved composition. All **112 accepted candidate dinners** carried a separate description. Baseline lacked that field, although some historical notes were already descriptive. One baseline $60 Plus result returned an estimated total of $151.75; the new implementation rejects over-budget estimates rather than treating that as acceptable. Do not interpret model-estimate differences as real grocery savings.

### Consistent review rubric

Apply the same questions to every case, recording “not assessed” where evidence is missing:

| Dimension | Review finding |
|---|---|
| Culinary appeal | Agent review: Plus more often has coherent dish concepts; Free still has familiar protein/vegetable/rice plates. Improvement is uneven, not a claim of universal excitement. |
| Ingredient coherence | Server checks named components, but do not prove a complete recipe works. Example remaining concern: biscuit-style crusts need further leavening/technique review. |
| Cuisine / technique variety | The adventurous Plus sample moved beyond repeated “inspired ... with rice” titles; actual ingredients were reviewed for corresponding flavors. This is a small sample, not an authenticity certification. |
| Protein variety | Constrained pantry menus are allowed to reuse available proteins. No fixed number of new proteins outranks availability, diet or budget. |
| Repetition | Rice-heavy menus still occur, especially Free and pantry-only. The results file includes every menu rather than only attractive examples. |
| Dessert creativity | Free moved from cookies/pudding cake to lemon oatmeal bars and chocolate-chip blondies. Plus produced apple oat crisp and lemon butter cake. Bakery diversity improved modestly; elaborate pastries are not guaranteed. |
| Budget | Accepted candidate estimates pass server totals including desserts/restock. Package costs, real store prices and pantry quantity sufficiency remain unverified. |
| Cooking feasibility | Equipment and explicit time checks pass for accepted outputs. Recipes have not been physically cooked or independently timed. |
| Dietary compliance | Known conflicts and uncertain compositions reject; zero accepted allergy menus in this experiment. No safety certification. |
| Description quality | Separate finished-dish descriptions observed for all accepted candidate dinners; historical cooking text uses a truthful fallback. |

### Fixed before/after examples

These are selected by fixed scenario/tier, not “best output” selection. Full menus and rejected cases are in the results file.

- **$60 Plus, baseline:** Roast Chicken with Potato Wedges and Carrots; Mexican-Inspired Black Beans and Rice with Cabbage Slaw; Mini Meatloaves; Chicken Pilaf; Egg and Potato Hash; Keema-Inspired Beef; Tomato-Braised Black Beans with Carrot Rice.
- **$60 Plus, candidate:** Chicken Pot Pie with a Biscuit Crust; Paprika Pork Chops with Mashed Potatoes and Cabbage; Spaghetti with Beef and Garden-Vegetable Sauce; Chicken Fajitas; Golden Tofu and Egg Fried Rice; Shakshuka with Skillet Flatbread; Mediterranean Baked Fish.
- **Dessert-inclusive Free, baseline:** Classic Oatmeal Raisin Cookies; Lemon Pudding Cake.
- **Dessert-inclusive Free, candidate:** Lemon Oatmeal Bars; Simple Chocolate Chip Blondies.
- **Description before:** “Season Chicken breast ... then roast alongside Potatoes ...” was procedural text in notes.
- **Description after:** “Tender chicken, carrots and peas fill a creamy gravy beneath a buttery, rustic biscuit crust. This cozy oven-baked dinner includes its vegetables in every serving.” Cooking instructions are requested separately in the full recipe flow.

## Dietary candidate — intentionally not ready for production

`MEALCADDIE_DIETARY_CANDIDATE` defaults off. It is server-controlled and **cannot lift the production restriction when `VERCEL_ENV=production`**, even if accidentally enabled. The shared Preview flag was not changed.

The candidate strictly parses the existing structured controls; nine explicit allergens are hard constraints. Lactose intolerance conservatively maps to milk exclusion. It checks all returned food sections, recipe steps, replacement/dessert outputs, restock and cached completed results. It also rejects unsupported safety claims. Plain explicitly avoided ingredients remain exclusions. Original text/settings are retained, including in saved JSON; no retrospective rewrite occurs.

Supported positive experiments are limited to a small explicit whole-food vocabulary. Composite sauces, brand formulations, ambiguous ingredients, unknown controls, unclassified legacy restrictions, custom allergy aliases, gluten exclusion and medical diets remain restricted. The live-model allergy cases were rejected because ordinary ingredients/composites fell outside that narrow verified vocabulary. Expanding the catalog merely to pass these cases would weaken the boundary and was not done. Cross-contact, manufacturer formulations and kitchen handling cannot be verified.

**Approval dependency:** review this evidence and a stronger composition/catalog design before any proposal to lift a production allergy category. This PR does not provide an environment-only route around the production guard. A disclaimer is not enforcement.

## Verification and release boundaries

Mocked regressions cover descriptions/history, hard constraints, all nine allergens and aliases, composite uncertainty, preserved original settings, cached results, schema correction and equipment negation. Existing quota, membership, expiry/revocation, account preservation, pantry/Vault, recruitment notifications, checkout and production-allergy tests run unchanged alongside them.

Mobile component review at 320px and 390px found no horizontal overflow. Enter opens and Space closes the actual React disclosure; expanded state and panel references are exposed. A historical recipe retains an honest fallback and a known sesame conflict stays prominent. The disposable review route was removed. Full NVDA/VoiceOver/TalkBack and physical-device checks remain separate review work.

No database migration is needed. No production settings, paid checkout, public applications, invitations, pilots, administrator notifications, legal text or retention procedures were changed. Production deployment requires owner approval; a non-destructive rollback is the previous application commit because data remains additive JSON with old-reader compatibility. Keep the existing allergy gate in place during any later quality-only release.

Pricing-source feasibility is in [localized-grocery-pricing.md](localized-grocery-pricing.md); future protein adaptation is documented in the [product roadmap](product-roadmap.md). No location pricing or protein swapping was built.

Evaluation pricing references: [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1) and [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), reviewed October 15, 2026. Remaining cost uncertainty is actual account billing/service terms, not a license to exceed the approved ceiling.

Final verification: **259 automated tests passed**, TypeScript passed, lint passed and production build passed. The only tool notices were existing Next lint deprecation and stale Browserslist metadata; no dependency upgrade was bundled. FDA ingredient-label reference reviewed: https://www.fda.gov/food/buy-store-serve-safe-food/food-allergies-what-you-need-know. This reference does not certify model output or replace ingredient validation.
