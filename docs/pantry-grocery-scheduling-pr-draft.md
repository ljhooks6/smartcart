## Draft PR review notes

**Proposed title:** Fix pantry quantities, grocery accuracy and dinner scheduling; pause breakfast/lunch

Pantry ownership previously hid entire requirements regardless of quantity, recipe-use amounts were mixed with guessed package costs, and scheduling did not show occupied dinner days. This branch aggregates requirements before applying measured inventory, adds one shared searchable pantry editor, preserves valid shopping progress, and supports deliberate dinner moves/swaps/removal. New breakfast/lunch requests are paused server-side for every account while saved content remains available.

The branch starts from production `b6909d07cb1808c5d427864d56aff8224059c2e3`; no allergy-library/beta candidate commits are included. Production allergy restrictions, server membership/access checks, Free/Plus quotas and existing content remain in place. No paid AI evaluations, billing or hosted configuration changes were made.

**Database review:** One additive pantry migration is prepared and disposable-database tested, but NOT applied to shared Supabase. It adds quantity/unit/status and extends the existing security-invoker save RPC while preserving owner RLS, Plus write guards and legacy name clients. Execution requires separate approval of the SQL checksum and fresh preflight. See the implementation review for lock timeouts and content-preserving application rollback.

**Validation:** The standard Next production build passed in the owner's normal Windows PowerShell terminal with unchanged file hashes/Git status. Fresh standard regression suite: 299 passed, zero failures/skips. Standalone TypeScript and standard lint passed. Actual 320px/390px interaction checks remain pending: Edge exited before opening a page with sandbox temporary-profile replacement and named-pipe errors. No browser retry or security changes were attempted. Do not mark ready for release until actual browser verification passes. The isolated npm installation and package manifest/lockfile remain unchanged.

**Outstanding browser review:** Use the existing normal Chrome session through its connected browser extension and supported viewport capability, or Chrome/Edge DevTools Responsive mode, at exactly 320px and 390px. This avoids launching a new browser process from the restricted context. The browser inventory and viewport capability were confirmed; no successful mobile interactions are claimed. See `docs/pantry-grocery-scheduling-mobile-review.md` for the remaining acceptance checks.

**Deployment:** Git deployment hold is false for this feature branch. Draft PR only; no merge, shared migration or production release is authorized.

**Limitations:** Unknown quantities/packages/prices require user review; no density or package-capacity guesses. Existing unowned device-only pantry data is retained without auto-assigning it to a different account. Pantry snapshots do not automatically measure consumption after cooking. The allergy-library candidate must retain its separate authoritative quantity/provenance adapter during future integration.

**Additional Improvements Worth Considering:** IMP-004 proposes an optional confirmed pantry-consumption review after cooking. Medium complexity/priority; benefits both tiers. It is recorded separately and is not implemented.
