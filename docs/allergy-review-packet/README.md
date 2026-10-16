# Ingredient-source candidate review packet — NOT approved for pilot

Prepared October 16, 2026 for internal review. **Unsent. No reviewer contacted or engaged.** All 48 recipes (36 dinners, 12 desserts) are authored engineering candidates. No professional review, practical cooking, clinical suitability or actual-product verification has occurred. Source checks are not an allergen-safety certification.

## Contents and requested decisions

- [Readable recipe cards](recipes.md) and [machine-readable specifications](recipes.json): quantities per serving, exact components, equipment, engineering time estimates, fixed steps, families, revisions and content digests. Each card says NOT TESTED / NOT REVIEWED.
- [Generic ingredient worksheet](catalog.csv): 59 exact-name profiles, source tags, units and evidence links. Generic identity references are not branded-product composition evidence. New cornmeal, white-bean and cauliflower records need qualified review alongside all earlier records.
- [Homemade component graphs](components.json): two fixed formulations; commercial stock, dressing, pesto and tahini cannot be inferred interchangeable.
- [Blank revision-level decision register](review-decisions.csv): accept/revise/exclude, conditions, cooking/yield evidence, credentials/date and pilot approval. No acceptance or credential verification has been fabricated.
- [100-generation rotation evidence](../../evals/allergy-library-rotation-results.json), [earlier adversarial examples](../../evals/allergy-aware-results.json) and [current integration design](../allergy-pilot-development-plan.md). The earlier evidence is historical; the catalog revision in each artifact identifies its scope.

Initial scope: explicit Milk, Eggs, Peanuts and Sesame exclusions, individually or combined. Reject additional allergies, unclear legacy restrictions, custom allergies, intolerances and medical diets. Vegetarian/Vegan ingredient preferences and exact cataloged ingredient avoidance can further restrict the candidate pool. This does not establish nutritional adequacy. Some candidates contain **fish, wheat or eggs**; they are not universally suitable. All actual labels, formulations, manufacturing, handling and cross-contact remain unverified.

Suggested ten-recipe calibration: lemon-chicken, chickpea-tomato-stew, salmon-green-beans, stuffed-peppers, turkey-meatballs, spinach-potato-gnocchi, cabbage-pancakes, polenta-mushrooms, lemon-shortbread and sweet-potato-cocoa-squares. This intentionally exposes raw/cooked quantities, mixed equipment, binding, raw flour, food-temperature and yield questions before commissioning the remainder. Approving one recipe does not approve its family or later revisions.

Practical review must measure preparation + elapsed time, batch capacity, actual yields, portions, hydration, binding/texture, doneness, handling, and plain-ingredient availability. Gnocchi, eggless patties, flatbread, biscuits, dumplings and cocoa squares have particularly uncertain texture/binding. Recipe temperatures reference [FoodSafety.gov](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures); this is not evidence the method or timing has been cooking-tested. Cost figures are ingredient-use illustrations and omit retail pack sizes/local pricing.

## Participant-facing language to evaluate

“The listed recipe ingredients were checked for your selected ingredient-source exclusions. Actual product labels, formulations, manufacturing, preparation and cross-contact are not verified. These are engineering candidates, not professionally reviewed recipes.”

Conflict: “Tahini is a sesame source; this recipe cannot be used with your selected Sesame exclusion.” Uncertainty: “We cannot establish this stock's composition. This recipe remains unavailable.” Stale saved artifact: “Saved content preserved; its current ingredient-source check cannot be verified.” No acknowledgment can override a conflict or unresolved composition.

## Research shortlist — no outreach authorized

These are potential reviewers whose published credentials and work appear relevant. **Current CDR status, any claimed license, availability, professional scope, insurance, independence/conflicts and willingness to review this product have not yet been verified.** This is a shortlist, not an endorsement or engagement. Verify credentials before contracting; obtain explicit permission before using a name publicly.

| Candidate | Published fit and primary source | Follow-up needed after outreach approval |
|---|---|---|
| Elizabeth Pecoraro, RDN | [Own brand-consulting page](https://eatinghealthy4life.com/for-brands/) offers food-allergy consulting, educational-material/product review and recipe development; [own biography](https://eatinghealthy4life.com/about/) describes allergy nutrition work. | Confirm revision-level catalog review, recipe cooking deliverables, supported four-source scope and specialist coverage; quote all deliverables separately. |
| Kristi Winkels, RDN, LD | [Own biography](https://www.eatingwithfoodallergies.com/aboutkristi/) describes food-allergy education and recipe development. | Confirm product-review consulting availability and licensing/credentials; clinical practice or publishing alone does not establish availability for a software review. |
| Sherry M Coleman Collins, MS, RD, LD, FAND | [Academy of Nutrition and Dietetics directory](https://www.eatright.org/find-a-nutrition-expert-details?id=114499a7-66a8-4214-959f-f69cd4aef34e) lists food-allergy management and product/menu/recipe development and labeling. | Confirm present consulting scope, culinary testing and independence/conflict disclosures; verify current credentials. Her own websites timed out during research, so they are not treated as a verified contact channel. |

Research uses public professional information only. No contact forms, emails or material disclosures were made. A qualified lead may require additional allergy-clinician input for claims and scope; this is a product review, not personalized patient care.

## Scope and cost approval before engagement

No quotes or fees obtained. Request a capped quote first for shared catalog/aliases + ten calibration recipes + UX/claims, then a separately priced remaining batch, cooking/yields, corrections/re-review and future revision maintenance. Avoid substituting patient-visit fees for product-review costs. The earlier 24–48-hour sensitivity was an engineering budgeting exercise only, not a reviewer estimate. No data subscription or paid AI call is required for this deterministic library.

Owner approval is required **before contacting any named reviewer or sending this packet**, then separately before contracting/paying. Hosted keys, participant allowlisting, protected-preview deployment/activation and production release each remain separate approvals. No qualified review has occurred merely because this packet exists.

Regenerate internal data files with `node scripts/prepare-allergy-review.mjs`. Review findings must be retained separately from generated exports so regeneration never overwrites real future reviewer decisions; the currently generated register is a blank template, not an operational findings ledger.
