# Mobile verification — 2026-10-19

Status: **responsive browser checks completed except the generated-meal replacement flow**. PR #10 remains draft and is not ready for release approval until that gap is resolved. All testing used normal Windows Chrome through the existing extension, the actual local built application, loopback-only synthetic auth/REST fixtures, and disposable data. No real accounts, hosted services, emails or paid AI calls were used.

## Results

| Check | Result / actual evidence |
|---|---|
| Exact viewport | Chrome viewport override verified via DOM: 320×900 and 390×900. Reset afterward. |
| Six tabs, Free and Plus | Week, Plan, Meals, Shop, Cook and Vault checked after their headings rendered at both widths. No horizontal overflow after the correction below. Meals has no generated options; populated saved content is covered in Week/Cook/Vault. |
| Pantry search and custom entries | Alias `green onion` finds existing `scallions`; duplicate addition prevented. Garlic cloves and garlic powder remain distinct. Custom entries, optional amount/unit and stock labels work; Quick-Select and Snapshot agree. |
| Unknown quantities | Amount unknown remains on the purchase list; explicit sufficiency confirmation excludes the ingredient for the current selection. Stock labels do not imply sufficient amounts. Confirmation is selection/session scoped, not permanent inventory. |
| Shared quantities | Carrots 2+1=3; rice dinners 1+½ cup plus dessert ½ cup=2 cups; garlic powder ½+¼ tsp=.75 tsp. Plus pantry subtraction occurs once: 2 carrots leaves 1; 1 cup rice leaves 1 cup; .25 tsp garlic powder leaves .5 tsp. |
| Conservative units and pricing | 1 bottle oil is not converted to tablespoons. Unknown salt stays unresolved. Salt/pepper split, preparation removed from lime/carrot identities. Prices remain unavailable instead of inventing package costs. Rice details list all three source recipes. |
| Persistence and isolation | Plus carrot edit to 2.5 each with low label survives Save Week/reload; legacy custom Family spice mix survives. Free pantry resets on reload, while its manual shopping extra/checkmark persist for that owner. Switching Free→Plus→other shows separate weeks, Vaults, pantry and extras. |
| Recalculation | Removing synthetic Carrot Roast updates rice gross 2→1.5 cups / shortage 1→.5 cup and garlic powder gross .75→.5 tsp / shortage .5→.25 tsp; carrots become covered by pantry. Navigation and schedule-only changes preserve valid shopping extras/checkmarks. |
| Scheduling | All seven days show availability or the assigned dinner. Quick selector disables occupied days. Explicit swap moves Soup to Tuesday and Roast to Monday; subsequent move to Saturday and removal of Potato's assignment work. Save/reload preserves metadata. Historical breakfast/lunch remain visible. |
| Keyboard | Enter opens scheduler; focus enters its Close button. Escape dismisses and restores focus to Move or swap days. Quantity Tab reaches its native unit select. |
| Tier behavior / pause | Free displays 5 plans/week and ten Vault recipes; Plus displays its existing policy and persistent pantry. Breakfast/lunch controls disabled with future-update text for guest/Free/Plus. Server/admin bypass rejection and ownership enforcement covered by automated tests, not inferred from mock REST. |
| Replacement browser flow | **Blocked:** local planning returns `Please start planning from MealCaddie` from the existing request-origin guard before reaching the generation fixture. No guard was weakened and no live generation was attempted. Actual generated-option replacement, and its end-to-end grocery refresh, still need a supported matching-origin local test. Automated replacement/reconciliation coverage passes. |

## Confirmed regression fixed

The populated Cook grid had a 367px document width at a 320px viewport. Native select intrinsic width expanded an implicit grid track. The correction gives Cook cards an explicit single-column grid/minimum width and stacks the native day-picker label/select on narrow screens with constrained select width. It does not change schedule rules, recipes, quota or authorization.

After rebuilding, all 24 Free/Plus tab/width combinations fit: document width ≤320 at 320px, and ≤390 at 390px. Cook measures 305/375 CSS px respectively with the normal vertical scrollbar. No clipping or hidden-overflow workaround is used.

![Corrected Cook at 320px](evidence/pantry-grocery-320-cook.jpg)

![Plus groceries at 390px](evidence/pantry-grocery-390-shop.jpg)

## Verification and evidence

- Fresh standard `.next` production build: **pass**, exit 0; no source hashes, status, HEAD or branch changed during build. Owner ran the guarded helper in normal non-admin PowerShell because the earlier Codex filesystem EPERM remains unresolved.
- After the layout correction: **299 tests passed, 0 failed, 0 skipped**; standalone TypeScript and standard Next lint passed. Build also ran lint/type validation. Existing next-lint deprecation and local queue-region fallback notices remain.
- Browser console contained earlier fixture CORS errors, corrected before the successful account tests; no new application error was attributed to those historical entries. The request-origin rejection above is a separate, recorded limitation.
- Full local evidence outside the repository: `outputs/pantry-mobile-final-tab-matrix.json`, `pantry-mobile-plus-shop.txt`, `pantry-mobile-*.jpg/.png`, `pantry-grocery-mobile-fix-build.log`, `pantry-grocery-mobile-fix-after.json`, and `pantry-grocery-mobile-{regression,types,lint}.log`.
- Disposable REST fixtures exercise browser behavior; they do not prove hosted Supabase RLS or substitute for the existing database authorization suite.

## Remaining gates

1. Resolve the local matching-origin fixture setup through supported development configuration and verify generated meal replacement at both widths. Do not loosen the origin guard.
2. Separate shared pantry migration review/approval remains required; it has **not** been applied.
3. Physical-device and full screen-reader checks remain separate; desktop responsive emulation is not a claim of VoiceOver/TalkBack/NVDA completion.
4. PR stays draft, with branch deployment disabled. No merge or deployment is authorized. PR #9 and production remain untouched.
