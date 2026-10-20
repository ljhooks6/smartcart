# Pantry, grocery accuracy and scheduling — implementation review

Status: source implementation complete; standard build, 299 regression tests, TypeScript and lint verified on 2026-10-19. Responsive Chrome review at 320px/390px, including generated-meal replacement and grocery/schedule save/reload, is complete. Confirmed Cook overflow, replacement schedule/quantity and shopping hydration defects are corrected and rebuilt. The latest final source passes 302 tests, standalone TypeScript and lint. See the mobile review and separate read-only migration review. The owner authorized draft publication with that limitation documented on `feature/pantry-grocery-scheduling`, based on production `b6909d07cb1808c5d427864d56aff8224059c2e3`. No merge, deployment, shared migration, paid AI calls or customer-record changes. PR #9's allergy-library candidate remains separate and untouched. This branch has a Vercel Git deployment hold.

## Confirmed causes and corrections

- Name-only pantry membership previously hid the whole ingredient, regardless of how much the selected week needed. Requirements now aggregate across selected meals and desserts, then subtract each compatible measured pantry quantity once. Unknown amounts remain visible until the user confirms enough for that exact selection. Stock labels do not imply quantities.
- Quantity/preparation text sometimes remained in product identities. Ordinary ingredients now separate name, amount/unit and preparation, normalize conservative aliases, retain dietary/form distinctions, and flag unresolved composites. Salt and black pepper split only when their amount is qualitative; a numeric blend is not divided by guesswork.
- Recipe-use amounts were conflated with package purchase estimates. Unverified package sizes/prices now show “Confirm package size” / “Estimate unavailable”; the UI does not present an incomplete zero total as a verified budget result. No ingredient/pricing API was added.
- The old day selector had no occupancy model. All seven days now show availability/assigned dinner names; occupied days require explicit swaps. Existing overlapping assignments are retained and must be resolved deliberately. Moves, swaps and removal change schedule metadata only. The existing five-selected-dinners limit is unchanged.
- Pantry Quick-Select and Snapshot now share an alias-aware search/editor with custom additions, duplicate prevention and optional quantities/units. Free/guest pantry edits remain current-session only; persistent memory remains Plus-only.
- The old global device form had no pantry owner. Its legacy fields and a recovery backup remain preserved, but are not silently assigned to another account. Cloud/draft pantry records with an established owner load normally. Lineups are also filtered by current owner during render, before auth-change reset effects run; newly selected generated meals are bound to the current identity, and foreign-owner selections are rejected. Any recovery of unowned device-only legacy data needs an owner-confirmed process; no such data is deleted by this implementation.
- Breakfast/lunch remained active in the form and request schema. Both now show future-update copy and are disabled. New job, direct replacement, legacy endpoint and queued-engine requests are rejected server-side with HTTP 422 before AI work. Saved/historical meals remain available. Administrators get no bypass.

## Before/after examples

| Example | Corrected result |
|---|---|
| Garlic powder: 1/2 tsp + 1/4 tsp | One ingredient, 0.75 tsp; no invented package price |
| Carrots: two recipes need 2 + 1; pantry has 2 each | Recipes use 3; still need 1 |
| Rice: dinners need 1 + 1/2 cup; dessert needs 1/2 cup; pantry has 1 cup | Recipes use 2 cups; still need 1 cup |
| “Salt and black pepper to taste” | Two named seasoning requirements, to taste; no two-package/$6 fiction |
| “1 lime, juiced” / “1 carrot, grated” | Lime/carrot counts; preparation kept separately |
| Owned rice, quantity unknown | Still listed with “Amount unknown”; explicit sufficiency action in Snapshot |
| One bottle of oil versus tablespoons required | No automatic package-capacity conversion; enter a compatible measurement or review |
| Monday Soup and Tuesday Roast; move Soup to Tuesday | Ordinary move blocked; explicit swap preserves both meals |

## Compatibility and boundaries

- Ordinary ingredient matching is shopping arithmetic, not allergen clearance. Production allergy-dependent generation remains restricted. No experimental library or diet feature is enabled.
- `lib/grocery-list.ts` retains its public exports. New grocery fields are additive. `estimated_price=0` with `price_status='unavailable'` means unknown, not a free purchase; all modified ordinary shopping displays honor that distinction.
- PR #9's future integration must retain its signed recipe/ingredient identifiers, canonical authoritative amounts, owner/provenance verification and trusted grocery adapter. It must not regenerate signed quantities through this free-text parser or use pantry aliases as safety/provenance proof. No candidate branch was merged here.
- US volume units are used for cup/tbsp/tsp conversions. Mass↔volume, count↔mass and unknown package/size conversions are not inferred. Brand/formulation differences remain distinct.
- Sufficiency confirmation is tied to the current gross ingredient requirement and selected meal names; it is not permanent inventory and is not synced as such. Replacements/quantity changes invalidate it; mere rescheduling does not.
- Shopping fingerprints invalidate stale checkmarks/removals when requirements change; valid progress and manual extras remain owner-scoped.
- Pantry quantities are snapshots, not automatic physical-consumption tracking. Users are told to update them after cooking. IMP-004 proposes a separately approved review/consumption flow.

## Prepared database prerequisite — NOT APPLIED

`supabase/migrations/20261019045435_pantry_quantity_accounting.sql`

SHA-256: `66bbe03436228caf7ba1cc8f0206ef22da852361bdd089874cff986afa8522e2`.

Adds nullable `quantity` / `quantity_unit` and a constrained `stock_status` defaulting to owned. Existing rows remain unknown-quantity entries. Replaces only the existing security-invoker atomic week-save function to accept validated pantry objects as well as legacy name strings. Legacy clients preserve measured metadata when their name uniquely matches an existing pantry entry. `pantry=null` still preserves inventory. Owner RLS, product access checks, verified Plus pantry-write triggers, Vault limits and function execution grants remain in force.

Execution requires separate shared-migration approval after a fresh read-only project/history/object/policy/content preflight. Apply only this reviewed file, never a broad migration push. It uses a transaction, 3-second lock timeout and 30-second statement timeout. Abort an uncommitted timeout/error; inspect rather than retry blindly. Verify function grants/security mode, constraints, existing triggers/RLS, account/subscription/content fingerprints and exact migration-history entry after execution. No account/tier/content backfill is proposed.

Preferred rollback: revert the application release only and retain the additive columns and backward-compatible function. The old-client string roundtrip is covered by local database tests and preserves existing quantities. Do not drop columns, reset/replay migrations, or restore a name-only function that erases measurement metadata. Any database corrective migration requires its own reviewed approval. A build/release must not proceed without its prerequisite or an explicitly reviewed fallback: the candidate currently retains drafts and blocks Plus pantry cloud sync if quantity columns are unavailable.

## Verification and outstanding work

- Isolated tests use mocked providers and disposable in-memory PostgreSQL only; no shared Supabase connection or real account changes.
- Final source regression run: **299 tests passed, zero failures**, including the new product-gate case, render-time owner separation, pantry arithmetic, SQL/RLS/entitlement checks, direct optional-meal API checks and rendered component semantics. No paid/provider calls or shared database writes were used.
- Read-only TypeScript semantic analysis passed. Source ESLint checks passed with zero rule errors/warnings using the unchanged config and installed Babel preset resolved by absolute path. The detached-worktree tooling also emits a React-version auto-detection notice; this is not a clean standard `next lint`/build claim.
- A temporary source-test resolver reads installed packages; it does not create the blocked filesystem junction, install packages, change application configuration or weaken permissions. No approval service is bypassed for protected filesystem/Git operations.
- Actual 320px/390px application checks, keyboard interactions in-browser and the standard Next build remain pending. Static React rendering checks validate labels, disabled options, occupancy, explicit swap/removal affordances and unavailable-price messaging; they are not physical/mobile browser tests.
- The normal automatic approval retry for dependency linking timed out after capacity failures. No additional escalation retries were started. Common Git metadata is outside the writable workspace; stage/commit/push and draft-PR publication have not been attempted during this blocked cycle. Nothing was merged or deployed.
- The tool provides no reviewer-capacity reset operation. A later user-requested retry can use the same normal approval path. Do not bypass review or create a tight retry loop.


## Resumed verification — 2026-10-19

- The approved isolated npm installation succeeded: 428 packages, Node 22.22.0 / npm 10.9.4, installation scripts disabled, dedicated cache at `outputs/npm-cache-pantry-grocery` outside this feature worktree. Dependencies are ordinary local directories, not a junction. No shared dependency writes were performed.
- The original npm attempt encountered `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. The owner separately approved Node's process-only `--use-system-ca` retry; TLS verification remained enabled and no certificate store/settings were modified. An initial ordinary-directory EPERM was resolved through scoped tool access, without ACL commands or elevation.
- SHA-256 values after successful installation match the reviewed baseline: package.json `e7340c6cbcdbabe982c4f041c86eb660cef6215997baea0aecff2035cda2bbf9`; package-lock.json `f9fb0200e98b25a1b68fa720c8c8e1a8f141f5446cba5d7882ecfa3294831213`; .npmrc `85f476be1a3acba36c6d8ac40ab2943a77867cd18d7159cc5211a80e07eb3a62`.
- The standard `npm run build` was attempted with synthetic loopback service values and no production credentials. It failed on `EPERM: operation not permitted, mkdir ...\.next\server\app\api`. A single retry after scoped `.next` tool access produced the same error. Inspection afterward found an ordinary `api` directory among partial build artifacts, not a reparse point. The precise underlying denial/race is not established; do not claim a source compilation error or successful build.
- Build output: `outputs/pantry-grocery-standard-build.log`. No extra installation scripts were run. No integrity mismatch was observed; the install remains subject to the previously documented incomplete lockfile integrity metadata.
- Verification stopped at the failed build. Actual 320px/390px browser checks, the current standard regression rerun, commit/push and draft PR publication remain pending. The earlier 299 passing source tests are historical evidence, not a replacement for these pending checks. No application source, account, billing, shared database, production or PR #9 changes were made in this resumed verification cycle.

## Normal-terminal comparison and final checks — 2026-10-19

- The owner's manually executed standard `.next` production build in normal, non-administrator Windows PowerShell **passed** (exit 0), including compilation, lint/type validation, all 18 static pages and build tracing. The same build had failed inside Codex with EPERM in both `.next` and `.next-auth-lab`. This isolates the observed failure to the execution context, without establishing the exact Windows denial mechanism.
- The comparison used a verified absolute Git executable, synthetic provider keys and loopback Supabase, with no active environment file. The normal-terminal report records zero changed file hashes, unchanged Git status, unchanged branch and unchanged HEAD. No dependencies, security settings or artifacts were changed/deleted by the helper; normal build output was written by Next itself.
- Fresh standard `npm test`: **299 passed, 0 failed, 0 skipped**. Standalone `tsc --noEmit --incremental false` passed. Standard `npm run lint` passed with no ESLint warnings or errors. Tests use mocked providers and disposable local databases, not shared accounts/data.
- Build notices: stale Browserslist data and local queue-region fallback to `iad1`; lint also reports Next's existing `next lint` deprecation. No dependency/configuration updates were made for those notices.
- The built application and empty REST fixture started successfully on loopback ports 3012/3013. Actual mobile verification then stopped at the first browser boundary: Edge launched but closed before creating a page. Playwright reported `Target page, context or browser has been closed`; Edge reported sandbox temporary-profile JSON replacement failures (`error = -5`), SSL proxy key-log opening failure and a closed named pipe. No successful browser page, screenshot or 320px/390px interaction result is claimed.
- No browser retry, alternate profile directory, elevation, sandbox/security change, commit, push or draft PR was attempted after this new environment restriction. The loopback servers were stopped. Browser verification and publication remain pending; PR #9 and all shared infrastructure remain unchanged.
- Evidence: `outputs/pantry-grocery-normal-terminal-build.log`, `outputs/pantry-grocery-normal-terminal-before.json`, `outputs/pantry-grocery-normal-terminal-after.json`, `outputs/pantry-grocery-final-tests.log`, `outputs/pantry-grocery-final-types.log`, and `outputs/pantry-grocery-final-lint.log`. These evidence files are outside the feature worktree and are not committed.

## Draft-publication review — 2026-10-19

- Remote `main` remained at the feature baseline, and the separate allergy-aware candidate branch remained at `e0d8e8ff2faa18588efb610f0891630770c26870` during publication preflight. No candidate commits are included.
- Reviewed source, test, documentation and configuration changes; the new migration remains review-only. No package/lockfile, authentication, Stripe or hosted-environment changes are included. The added Vercel branch hold prevents this feature push from automatically deploying.
- A changed-file secret-pattern scan found no private-key, provider-secret or GitHub-token patterns. No environment files, dependency directories, build output, logs or private output artifacts are included in the intended commit. This scan supplements review; it is not a claim that pattern matching proves absence of every possible secret.
- The GitHub connector was unavailable. Normal Git network access succeeded after the supported scoped permission grant for GitHub access and the existing common Git metadata directory; no Windows ACL, sandbox configuration or TLS settings were changed.
- The existing normal Chrome browser/extension connection and its explicit viewport capability were confirmed as a supported next testing route. Actual mobile verification remains incomplete; see `docs/pantry-grocery-scheduling-mobile-review.md`.
