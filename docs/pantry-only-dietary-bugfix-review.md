# Pantry Only and dietary Review bugfix

Baseline: production main `07fc4c8` (PR #14). Branch: `fix/pantry-only-dietary-review`.

## Confirmed causes and corrections

- Before changes, a mocked, valid single-dinner pantry response with zero purchase prices returned HTTP 500. Both the fixed seven-dinner response schema and strictly positive ingredient-price schema contradicted pantry-only prompts. Pantry Only now accepts one to seven distinct suggestions, permits omitted/zero purchase prices, and returns an actionable 422 when no feasible dinner is returned. Ordinary planning still requires seven dinners and positive price estimates.
- Before changes, the independent validator rejected Green onion when Scallions was available. Pantry validation now reuses the existing grocery parser's reviewed aliases. Fresh/dried forms, garlic/powder, milk alternatives, grain varieties and dietary formulations remain distinct. Unresolved composite names are rejected; even water must be explicitly available.
- Prompt inventory and validation now use one availability helper: on-hand and running-low names may be used, restock-only items may not. The UI also excludes zero quantities and restock entries from its generation list. This does not modify stored pantry entries.
- Pantry output is not padded with renamed recipe-family/ingredient duplicates. Plus soft variety refinement does not demand seven pantry dinners. Existing hard-constraint correction bounds remain unchanged.
- Review rendered the serialized `formState.diet` verbatim. It now uses `readDiet()` through a display-only summary covering preferences, allergies, custom allergies, intolerances, medical notes and legacy text. Unreadable serialization produces a warning, preserving the original storage and generation input. The dietary editor also avoids exposing malformed serialized text.
- Unavailable ingredients, input problems, invalid model output, provider failures and unsatisfied hard constraints have distinct responses. The existing job worker carries actionable error text to the client.

## Focused verification

- Baseline reproductions: both the short/zero-cost response and scallion alias checks failed before implementation; both pass afterward.
- Focused regression set: pantry-only bugfix, dietary summary, recipe quality, meal types, pantry/scheduling UI, grocery reliability and production allergy safety. No paid AI calls.
- Free and Plus mocked generation: one, three and seven options; unavailable ingredients; zero feasible options; renamed duplicates; malformed model output/provider failure; zero purchase costs; desserts; reviewed aliases and product distinctions; time/equipment/dietary enforcement.
- Unknown pantry amounts stay in Check Pantry, including items labeled stocked. Known compatible amounts are subtracted conservatively and once. Existing Free 5/week and Plus 20/week limits are unchanged.
- Local synthetic browser journey at 390px: authenticated application POST → in-memory job fixture → actual worker and generator with mocked provider → one pantry suggestion → selection into This Week → Shop quantity refresh. One mocked provider call, zero external calls/emails. Rice remained an unknown quantity check; measured scallions covered the green-onion requirement.
- Actual Review at 320px, 390px and 1280px: readable Vegetarian and Milk/Sesame labels, no internal marker, no horizontal overflow. Synthetic allergy settings were inspected only; allergy-dependent generation remains restricted.
- Screenshots and sanitized fixture audit are outside Git under `C:\Users\hooks\Documents\Codex\pantry-only-review-evidence`.

## Boundaries and limitations

Unknown or insufficient pantry quantities are not certified sufficient for a whole plan. Suggestions retain recipe amounts and explicitly require a pantry quantity check; grocery derivation remains authoritative. Recipe feasibility beyond deterministic ingredient, equipment, time and dietary checks still depends on model output. Alias coverage is deliberately conservative. The no-feasible response describes inability to produce a compatible plan, not mathematical proof that no recipe exists.

No migration, storage format, authentication, access, quota, billing, invitation or allergy-gate changes. PR #9 is excluded. No production deployment or real-user mutations. Preview testing must retain Vercel Authentication and avoid paid generation against shared services.
