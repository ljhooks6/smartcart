# Local application accessibility and device gates

The six ordinary sections are reused inside a separate local application runtime: Plan controls, Meals/details/replacements, Week summary, Cook/day-picker/interactive recipe, canonical Shop requirements, and Vault actions. Engineering-candidate limits are visible near relevant food decisions; the full safety notice remains linked. A source check must never be read as professional approval.

## Available automated/local coverage

Use `MEALCADDIE_TEST_LIBRARY_BROWSER=1` with the opt-in disposable runner and an installed Playwright module. It launches an isolated headless Edge profile and loopback Next server, creates no external email and blocks all external browser requests. Test both disposable Free and Plus accounts. Evidence is stored in `evals/allergy-library-application-browser.json` after a fully successful run; it is not physical-device evidence.

Check all six tabs at 320, 390 and 1280 CSS pixels, accessible control names, no horizontal overflow, keyboard dialog focus containment/Escape/return, cooking checkoffs, account clearing and withholding results after a changed restriction. Ordinary recipe-dialog behavior remains unchanged when the optional source notice is absent. No automated accessibility score is a substitute for assistive-technology testing.

## Separate launch gates — NOT completed

| Platform | Required full pass | Evidence to record |
|---|---|---|
| Windows + NVDA / supported browser | Landmarks/headings; all Plan labels and grouped exclusions; unsupported/failed checks and result announcements; navigation/current section; Details; replacement dialog; day picker; recipe dialog trap/return/checkoffs; Shop collection; Vault restore/delete; account change. | OS/browser/NVDA versions, tester, date, exact commit, expected/actual output, defects and retest. |
| iPhone + Safari + VoiceOver | Same journey using touch exploration/rotor, virtual keyboard, dynamic text, portrait/landscape, dialog close while deeply scrolled; candidate limitations and uncertainty comprehension. | Physical device/iOS/Safari/VoiceOver versions, 200% text/reflow and focus/reading-order results. |
| Android + Chrome + TalkBack | Same journey with swipe navigation/keyboard, touch targets, dialog reading order and dismissal, account clear, error recovery. | Device/Android/Chrome/TalkBack versions and test evidence. |
| Physical devices, screen reader off | Keyboard appearance/scrolling, no hidden submit/close controls, orientation, browser zoom/text scaling, slow/offline/reconnect, expired local session, changed exclusions, checks versus collection state. | Device/browser, conditions, screenshots without personal data, failures and corrected retest. |

Use synthetic local data now; a real protected-device session requires a separately approved reachable isolated environment. Do not expose a LAN/tunnel, disable Vercel protection, enter real credentials in the local lab or enroll current beta participants to obtain this evidence.

Release acceptance: no keyboard trap outside the intended modal, focus returns to the launching control, actionable errors announced without losing entered restrictions, controls reachable at large text and small widths, no solely color-based safety states, and participants accurately explain actual-label/cross-contact limitations. Unresolved critical accessibility defects block pilot activation; cosmetic improvements can wait. All three full screen-reader and physical-device gates remain open until evidence is recorded.
