# Grocery and recipe reliability

The stored meal ingredient array is the shared source for recipe ingredient lines and shopping requirements. This applies to dinners and Sweet Treats. Recipe instructions receive the same names and amounts; the API returns the stored ingredient lines rather than an independently generated list. Recipe requests are refreshed when a meal's ingredients, servings, or notes change.

## Shopping rules

- Preserve the recipe's shopping name, including varieties, dietary qualifiers, and fresh/dried/canned/frozen forms.
- Merge only identical ingredient identities, allowing case, common plurals, explicit preparation suffixes, and narrow aliases such as elbow macaroni/macaroni and garlic cloves/garlic.
- Add compatible quantities, including fractions and mixed numbers. Keep incompatible or ambiguous quantities visible with `+`; never drop repeated package requirements.
- Treat typed pantry entries and quick-select entries as owned. Match specific identities rather than broad food families: owning spaghetti does not imply owning macaroni, and owning dairy milk does not imply owning coconut milk.
- Restock overrides owned status. An ingredient already needed by a recipe receives one shopping row rather than a second restock row.
- Restoring an owned ingredient affects that specific ingredient; it does not restore other rice varieties or pasta shapes.
- Show a buy amount only when recipe quantities support it. Do not promise that one carton or box will cover an unknown volume of ingredients. Prices remain approximate package estimates.

Generic pantry descriptions are intentionally conservative. If the pantry says `rice` and the recipe requires `jasmine rice`, the shopping list keeps jasmine rice until the user records that specific variety. This avoids hiding a required ingredient through an assumed substitution.

Existing saved meals without stored ingredients retain the legacy recipe-generation fallback. New recipe detail requests cannot establish a guaranteed shopping list for those older records. AI cooking steps are guided by the stored list but remain generated text; their correctness still needs cooking review.

## Validation

Use Node 22:

```text
npm run test:grocery
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

The regression suite includes a five-dinner week plus two Sweet Treats, exact pantry exclusions, different forms and varieties, quantities, department placement, restock, and restoring/removing ingredients. No additional test dependencies are required.
