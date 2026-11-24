# Assignment 01 — Pantry Only dietary transport blocker

Base: `a0c8bf72df5430b1475e6802eb955776c182da5c` (latest main, including merged PRs #14–#16).

## Confirmed root cause

`writeDiet('', emptySettings)` begins with `\nMealCaddie dietary settings v1: `. Clearing the original-entry field and leaving all selections empty produces this legitimate unrestricted value. Planning draft storage preserves it. `submitPlan` then used `safeTrim(formState.diet)`, removing the leading newline. `foodSafetyResponse` requires that exact structured marker, so the transported value fell back to the conservative legacy guard and received HTTP 422 / `ALLERGY_GENERATION_RESTRICTED` before reservation or any AI call.

Reproduced against unmodified main by evaluating the actual client dietary expression and posting through the real `/api/generate-list` route with synthetic identity/storage. Expected 202, actual 422. The separate fresh-default regression also failed: initial planning imposed Vegetarian. Vegetarian itself passes the existing guard; it was not the cause of the allergy rejection.

## Payload and persistence trace

1. Fresh planning used a hardcoded Vegetarian value. It now uses No preference.
2. Completed household preferences supply defaults. Explicit household restrictions are serialized into `customAllergies`, remaining restricted.
3. An owner-matching saved planning draft overrides defaults; other owners' drafts are ignored. Existing draft dietary values are preserved exactly. No stored Vegetarian value is guessed to be accidental or deleted.
4. Dietary Settings uses `readDiet` / `writeDiet`. Unchecking ordinary preferences does not erase original text, allergies, intolerances or medical notes. Review continues to show the original entry separately.
5. Review and request construction now share `dietForGeneration`: nonempty values are returned byte for byte; only genuinely blank/whitespace input becomes No preference. Planning, meal replacement and dessert replacement all use it.
6. `useGenerationJob` JSON-serializes the input unchanged. The route schema retains the string, and the existing safety check runs before quota reservation. Existing worker safety and output checks remain unchanged.

## Narrow correction and boundaries

No dietary safety validator, parser, allowlist, request schema, quota, persistence format or API authorization changed. No migrations. PR #16's visible/durable error handling is retained. Valid empty envelopes can now reach the already-supported normal path; the guard is not bypassed or relaxed.

Review normalizes its blank display consistently with the submitted No preference value. It also warns on unsupported envelope fields, which the existing server already rejects; previously those fields could be absent from the summary. Original input remains intact.

Malformed/trimmed legacy envelopes remain restricted. Meaningful original text, unknown fields, allergies, intolerances, medical notes and ambiguous restrictions are never automatically erased or repaired. A saved original Vegetarian entry remains meaningful even if the separate Vegetarian checkbox is unchecked; edit that visible original-entry field deliberately if it was not intended. Never remove an actual restriction to obtain a plan.

## Verification

- Both baseline regressions failed before implementation and pass after correction.
- 126 tests pass across the full relevant suites: new payload/restoration regressions, dietary summary/legal safety, production allergy safety, recipe quality, pantry-only, generation API/jobs/feedback, account integration, pantry/scheduling UI, pantry/grocery scheduling, grocery reliability and meal types.
- New coverage: actual submit expression through the route; fresh/returning Free and Plus; owner-scoped drafts and household defaults; cleared selections; preserved intentional/legacy restrictions; unknown/malformed envelopes; all three dietary transport paths; and unrestricted serialized Pantry Only with one mocked provider call returning a valid short plan.
- TypeScript, ESLint and standard `npm run build` pass. Build used synthetic local settings; no real credentials, hosted data, emails or paid AI calls.
- Review rendering and PR #16 error-visibility regressions remain covered. No claim of a live production generation test.

## Exact manual verification

1. On the protected Preview, inspect a separately authorized test identity only. Do not use customer accounts or remove actual restrictions. A real Generate click may use shared quota and paid AI; it is not part of this verification without separate authorization.
2. For a synthetic unrestricted scenario, open Preferences. Leave allergies, custom allergies, intolerances and medical notes empty. Clear only the synthetic original-entry text, select Vegetarian, then unselect it. Continue to Pantry, choose Pantry only, and add Rice and Scallions. Continue to Review. It must show no selected dietary preference/allergy and no serialized data.
3. At an authorized generation attempt, inspect `POST /api/generate-list` in DevTools. The dietary string must retain its initial newline before the marker. It must not be rejected with `ALLERGY_GENERATION_RESTRICTED` merely because all structured selections are empty. A different provider/infrastructure/constraint failure must retain its useful error.
4. For negative testing, declare a synthetic Milk allergy or medical/intolerance entry. Review must show it and generation must return 422 / `ALLERGY_GENERATION_RESTRICTED`, before reservation/provider work. Do not change any real restrictions for this test.
5. Reload the synthetic owner's saved draft; the settings must remain intact. Switch test owners and verify their separate drafts. Existing intentional Vegetarian/other preferences must remain selected or visible as original text.

Zero-cost deterministic execution, including the real route and mocked provider journey, is available with Node 22 from the repository root:

```powershell
& 'C:\dev\tools\node-v22.22.0-win-x64\node.exe' --experimental-strip-types --test tests/unrestricted-pantry-generation.test.mjs
```

This command uses synthetic data only, performs no hosted calls, and leaves production unchanged. Production merge/release and any live manual generation require separate owner approval.
