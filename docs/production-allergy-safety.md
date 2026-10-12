# Production allergy safety restriction — review and release
## Scope
Branch fix/production-allergy-safety starts directly at verified remote main 394e33d8179cb578f5e81eeaa2a27f57f1ac269b. No beta recruitment/onboarding commit or feature is merged or extracted. No migration, environment, authentication, subscription, model or spending-limit change.

This uses the authorized fail-closed fallback. It does not certify ingredients or claim a comprehensive allergy matcher. Allergy/free-from/intolerance signals and unclassified dietary text temporarily refuse new AI food generation with HTTP 422 and an actionable message. Known ordinary preferences (vegetarian, vegan, pescatarian, halal, kosher, low sodium, low carb/fat, high protein, keto, Mediterranean and ordinary meat exclusions), including comma/semicolon/newline combinations, remain supported. Explicit blank/none/no-preference values remain supported. Missing diet context is rejected on recipe/replacement generation.

The legacy free-text value is not changed or migrated. Some nonstandard but non-allergy descriptions will also be refused because the patch cannot safely classify them; users must not erase actual restrictions to bypass the warning. Ordinary taste exclusions remain handled by the existing ingredient checks. This cannot protect an allergy the user does not disclose or falsely labels as absent.

All relevant generation entry points are guarded: weekly reservation POST, direct weekly generator used by workers, recipe generation, meal/treat replacement and the example-plan route. Cached job GET responses with restricted input are blocked. Existing queued jobs can still dispatch into the guarded generator and fail through the existing reservation-failure path with zero AI usage; failed jobs are excluded from usage under existing behavior. No saved recipe/menu/pantry/Vault content is deleted or rewritten.

AI ingredient consolidation is temporarily restricted for every valid request. It lacks trustworthy restriction/source context, so returning a guessed rewritten ingredient list would reopen the gap. The current app's deterministic shopping grouping is unchanged; external direct callers of the legacy AI endpoint receive 422. Existing prices, grouping identities and qualifiers remain handled by baseline grocery code.

Visible notices in the planning field and across app tabs explain the restriction, independent label/preparation/cross-contact verification, and that saved food content is not certified suitable. This is stronger than a disclaimer alone because no restricted new recommendation is issued.

## Confirmed before/after results (mocked providers)
| Production baseline failure | Baseline | Patch |
| --- | --- | --- |
| Milk allergy / milk recipe | 200, one provider call | 422, zero calls |
| Sesame allergy / tahini substitution in steps | 200, one call | 422, zero calls |
| Soy allergy / tofu | 200, one call | 422, zero calls |
| Shellfish allergy / prawns | 200, one call | 422, zero calls |
| Peanut allergy / groundnuts | 200, one call | 422, zero calls |
| Dairy-free / caseinate | 200, one call | 422, zero calls |
| Nut-free weekly plan / peanut dessert | 200, one call | 422, zero calls |
| Dairy-free weekly plan / milk restock | 200, one call | 422, zero calls |

Each baseline case was reproduced against Git source 394e33d before patch wiring; final tests run both baseline and patched source in memory. No live provider or shared database call occurred.

83/83 tests pass: all nine major allergen declarations, aliases in the eight confirmed cases, multiple/custom/unclassified restrictions, compounds, ambiguity, substitutions/regeneration, dessert/restock, pantry-only replacement, cached results and old queued work, ordinary planning, existing verified Free/Plus model selection/auth failures, grocery reliability, Vault/save/recovery/week/shopping persisted-content behavior. Existing ordinary food fixtures now explicitly state No preference or Vegan; allergy-dependent endpoints intentionally return 422 rather than pretending an old correction produced a verified recipe.

TypeScript, lint and Next build pass. Local builds used a compile-only OpenAI placeholder, no real Supabase configuration and no provider requests. Nonblocking warnings: absent local Supabase configuration, stale Browserslist, local Queue region default and Node module-type inference.

## Exact changed files
- lib/allergy-safety.ts
- lib/meal-generation.ts
- app/api/generate-list/route.ts
- app/api/get-recipe/route.ts
- app/api/replace-meal/route.ts
- app/api/replace-dessert/route.ts
- app/api/meal-plan/route.ts
- app/api/consolidate-ingredients/route.ts
- components/smart-cart-context-form.tsx
- components/smart-cart-app.fixed.tsx
- tests/production-allergy-safety.test.mjs
- tests/food-quality.test.mjs
- docs/production-allergy-safety.md

## Approval and minimal release
1. Review this temporary restriction and its compatibility impact, particularly unclassified dietary text, missing recipe context, cached allergy jobs and the AI consolidation endpoint.
2. Obtain explicit approval to merge this dedicated PR and deploy the reviewed patch. No merge or Production deployment is authorized yet.
3. Reconfirm main has not changed; if it has, rebase/review and repeat relevant checks. Keep beta PRs out of the release.
4. Merge only the approved safety PR into main, then use the existing Vercel Production pipeline and Production environment. No migration or environment edit is needed. Do not promote an artifact built with Preview variables as if it had Production configuration.
5. Verify exact released commit and healthy public page. A restricted synthetic request can verify 422 with zero AI calls; any paid ordinary live-generation test needs separate approval. Check existing auth/membership and reservation failures without sending emails.
6. Monitor generic error codes and failures without logging dietary text. Address regressions with a forward fix that retains fail-closed behavior.

Rollback candidate: current production deployment dpl_5fn7svkRb9ZRu5bpWj74onbGcxfH / 394e33d. A Vercel rollback restores prior code without database rollback, but reopens the known allergy vulnerabilities. Do not roll back automatically; obtain approval and prefer a forward correction that retains the restriction. No customer-content cleanup accompanies rollback.

Future removal of the restriction requires an explicitly reviewed ingredient/composition validation design and evaluated failure corpus. It is not enabled by merely adding more aliases or a warning.
