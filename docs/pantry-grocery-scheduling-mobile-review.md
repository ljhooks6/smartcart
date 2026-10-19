# Remaining mobile verification

Status: **incomplete**, a release blocker. The standard production build, 299 tests, standalone TypeScript and lint passed. No actual 320px/390px application interaction result is claimed.

## Supported execution route

On 2026-10-19, the connected normal Windows Chrome session was available through the existing browser extension. Its documented viewport capability supports explicit width/height overrides and resetting them afterward. This is the preferred next route: use the already-running normal browser, without a new restricted Edge process or security changes. Manual Chrome/Edge DevTools Responsive mode is also suitable. Neither desktop resizing alone nor static component rendering establishes an exact viewport check.

Use the already-built application on a loopback-only address, with synthetic service keys, local service fixtures and disposable browser data. Keep production accounts and hosted services out of the test. Do not generate paid AI meals to obtain fixtures. A normal-browser page must be confirmed to reach the local server before testing; if Codex-started loopback processes cannot be reached from that session, stop and use an owner-started normal-terminal local server under the same reviewed synthetic configuration. Do not relax network isolation or enable remote debugging to solve connectivity.

The previous restricted Edge attempt exited before opening a page, with temporary-profile replacement failures and a named-pipe error. Do not repeat it or work around it with alternate profile directories, sandbox-disabling launch options, permission changes or elevation.

## Acceptance checks at both 320px and 390px

- Navigate Week, Plan, Meals, Shop, Cook and Vault; check horizontal overflow, text wrapping, bottom navigation and keyboard focus.
- Search pantry options by name and aliases; add a custom entry; prevent duplicate additions; edit quantity, unit and stock label. Confirm Quick-Select and Snapshot show the same current-session state.
- Verify unknown-amount messaging and explicit sufficiency confirmation. With disposable Free/Plus fixtures, verify session-only Free pantry behavior, owner-scoped Plus persistence/reload and isolation on account changes. Mocked browser fixtures do not replace the already-passing database authorization tests.
- Use synthetic meals sharing carrots, rice and garlic powder. Verify combined requirements and partial shortages, incompatible-unit review, no repeated subtraction, no guessed package prices, ingredient-to-meal details and valid retained shopping checkmarks/manual extras. Recheck after meal replacement/removal and reload.
- Show every day as available/occupied, including the assigned dinner. Check blocked accidental duplicates, deliberate move/swap, assignment removal and consistent Week/Meals/Cook state. Reload persisted synthetic schedules. No recipe generation or quota use is needed for scheduling.
- Confirm breakfast/lunch controls are disabled with future-update wording for every tier, while historical saved breakfast/lunch fixtures remain readable. Server rejection before provider work is already covered by automated tests.
- Record screenshots, exact viewport dimensions, keyboard interactions, console errors, fixture ownership and outcomes. Reset temporary viewport overrides afterward. Real-device and screen-reader testing remain separate from desktop responsive emulation.

Do not merge, deploy or apply the pantry migration until the remaining verification and separate release/database approvals are complete.
