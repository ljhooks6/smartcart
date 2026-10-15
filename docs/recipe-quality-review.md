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

Verification of the original recipe-quality revision: **259 automated tests passed**, TypeScript passed, lint passed and production build passed. The only tool notices were existing Next lint deprecation and stale Browserslist metadata; no dependency upgrade was bundled. FDA ingredient-label reference reviewed: https://www.fda.gov/food/buy-store-serve-safe-food/food-allergies-what-you-need-know. This reference does not certify model output or replace ingredient validation.

## Follow-up: recurring meal families across generations

The owner reports repeated fried-rice suggestions in actual use. Code inspection confirms an explanation: the client previously sent only titles from the current generated plan and Cook menu, discarded older completed plans, and never sent rejected titles to full-plan generation. Rejections existed in memory only, were remembered only after a successful replacement, and were used only for Plus replacements. Exact-title exclusion treats Chicken Fried Rice, Vegetable Fried Rice and Egg Fried Rice as different choices. Existing format/protein checks mainly examined one seven-dinner response; they did not prevent one fried-rice dish from returning in every new plan. Low temperature, repeated frugality/pantry-reuse instructions, a stir-fry-over-rice example and a conflicting numeric protein reminder reinforced predictable defaults. These are code-level contributors, not proof of the model's internal reasoning.

Reclassifying the **already collected** synthetic menus found these recurring families (number of accepted plans containing the family, not distinct users or longitudinal customer activity):

| Family | Baseline, 15 accepted plans | Original quality candidate, 16 accepted plans |
|---|---:|---:|
| Fried rice | 5 | 8 |
| Lemon chicken | 11 | 8 |
| Beans and rice | 9 | 5 |
| Quesadillas | 5 | 6 |
| Potato hash | 4 | 2 |
| Stir-fry | 4 | 3 |

All those menus included rice somewhere; a rice side is not automatically a repeated dish. The cases share a stocked pantry, so these counts demonstrate fallback patterns in that dataset, not population prevalence or a before/after result for this follow-up. No further paid evaluations were run.

### Correction

- The authorized worker reuses the latest **three completed plans in the preceding 14 days** from the existing private generation-job table. Both `owner_key` and `user_id` are checked; guests use their individual server-issued cookie identity, never a shared network quota. Failed/current/future/older jobs and other accounts are excluded. Only dinner titles reach the prompt; historical dietary inputs, ingredients, feedback and provider usage are not forwarded. No new public history endpoint, RLS changes or migration.
- History loads after authorization/claim, with a two-second timeout and a graceful fallback to current request context. It does not alter the stored input or idempotency hash. No server history is copied into the public job input or an account-independent cache.
- A shared local classifier groups fried-rice variants (including stir-fried rice and common named variants), stir-fries, rice bowls and the other observed families. It distinguishes rice sides, risotto, pilaf and jambalaya from fried rice. It is deliberately a small heuristic vocabulary, not a universal semantic classifier.
- Initial prompts distinguish within-plan diversity from across-generation rotation. Up to four recent families receive a short-term preference to rotate away, with rejected families strongest and common rice-default patterns prioritized. Swapping fried rice for another generic stir-fry/rice bowl is not presented as novelty. Instructions favor recognizable compatible dishes and economical ingredient overlap rather than maximizing pantry reuse. Contradictory numeric protein guidance and the anchoring stir-fry example were removed.
- Up to twelve rejected titles are now remembered for 14 days in the current account's browser storage, including when a replacement fails. They are cleared by the existing reset action and ignored after expiry. Owner checks prevent reuse after switching accounts. Both Free and Plus full-plan and replacement requests receive this context. Rejections are not a cross-device preference service; recent completed plans supply server history across devices for a signed-in account. Local expiry is pruned on use/visit, not by a new background cleanup process.
- Fried rice remains available when specifically requested through the existing must-have field or when constraints make it reasonable. Asking for rice/eggs alone is not interpreted as asking for fried rice. Dietary safety, pantry-only availability, budget, equipment, cuisine and time remain ahead of novelty. Saved recipes/plans are not rewritten.
- A separate deterministic `varietyReview` records within-plan family counts and recent-family overlap in the owned result. **It never requests a paid retry, fails a valid plan, removes dinners or edits ingredients.** The new rotation is culinary guidance, not a claim of guaranteed model diversity. If a provider ignores it, the review exposes the overlap without charging for an automatic replacement. Existing safety/schema correction and pre-existing Plus refinement behavior retain their original bounds.

### Follow-up verification and review hold

`tests/meal-variety.test.mjs` adds 13 mocked tests: family aliases; within/across-plan distinction; other fallback families; request/constraint exceptions; bounded account/guest history; history failure fallback; bounded expiring rejection storage; schema ownership isolation; consecutive Free/Plus requests with different family context on the initial call; provider noncompliance without an added call; worker idempotency/input preservation; and Free replacement rejection context. The consecutive-generation fixture verifies the request/response wiring, **not a new live-model quality measurement**.

Final follow-up verification: **272 tests passed; TypeScript, lint and local production build passed.** The mobile allergy-banner work remains part of PR #8; the production allergy restriction is unchanged. No account, shared database, provider model, spending limit, billing or environment-variable changes.

At the owner's explicit request, `vercel.json` disables automatic Git deployment **only for `feature/recipe-quality-dietary-controls`** while this revision is reviewed. Existing production and protected deployments remain in place. This uses Vercel's documented branch-specific [`git.deploymentEnabled`](https://vercel.com/docs/project-configuration/git-configuration) setting. A later approved Preview review can remove that one branch entry; merging or deploying remains separately gated. No current preview URL is evidence of this follow-up's deployed behavior.

## Correction: verify the full mobile application shell

The owner correctly identified a remaining paragraph directly inside the application `<main>` at `6b7abf6`. The earlier isolated component review did not catch that global paragraph, so the prior mobile-banner completion claim was incomplete.

The global paragraph is removed. Its saved-recipe/grocery-list caveat is consolidated into the existing planning notice in `SmartCartContextForm`, next to dietary controls. The notice retains the instruction to keep genuine restrictions entered and now links directly to the complete `/legal/safety` document. The mobile Plan panel and desktop planning form share that component. Existing context-specific ingredient checks and the recipe-modal warnings are preserved.

The **actual `/planner` application**, not a replacement tab-shell or isolated `DietarySafetySummary`, was exercised in Chrome using disposable browser-local saved content. The loopback-only server used dummy credentials and an empty local REST fixture, with no shared Supabase connection, AI generation or email delivery. A temporary fixture-seeding route was removed before commit and build.

| Mobile tab | Planning notice visible at 320px | Visible at 390px | Horizontal overflow |
|---|---:|---:|---|
| Week | No | No | None |
| Plan | Yes, once | Yes, once | None |
| Meals | No | No | None |
| Shop | No | No | None |
| Cook | No | No | None |
| Vault | No | No | None |

Enter-key navigation was exercised across all six tabs. The actual Cook → View Recipe flow opened a cached synthetic saved recipe with a sesame/tahini conflict; the known-conflict warning and safety link remained visible, and the keyboard-operated close control worked. The complete safety link opened the actual legal document. At 1280px the desktop planning form showed one planning notice and no direct global paragraph. These are browser viewport checks, not full NVDA/VoiceOver/TalkBack or physical-device certification.

`tests/mobile-safety-placement.test.mjs` verifies actual planning-form HTML and full-shell placement; the old integration assertion requiring the global paragraph was corrected to require contextual placement instead. Production allergy-restriction regressions remain mandatory. Rendered browser evidence is retained locally in `outputs/mobile-notice-browser-results.json` and Week/Plan/recipe screenshots; no test route or synthetic account is published.

Final correction verification: **33 targeted tests and all 274 regression tests passed; TypeScript, lint and the local production build passed.** The build contains no disposable review route. No paid AI evaluation, shared migration, production deployment, account change or restriction change was performed.

### Additional Improvements Worth Considering

The confirmed overlap among Plan's general safety messages is recorded as **IMP-001** in [improvement-backlog.md](improvement-backlog.md). Complexity Low; priority Low; benefits both tiers; no paid-service cost. It is a proposal for owner review, separate from the product roadmap and not implemented as part of this correction.
