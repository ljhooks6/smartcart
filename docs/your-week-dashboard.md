# Your Week

Your Week connects chosen dinners and sweet treats, their active shopping list, pantry exclusions, approximate grocery cost, and cooking progress. It is the opening view on mobile and appears above the planner on desktop. Generated options stay distinct from chosen meals; the post-generation handoff offers Review Your Week.

Shopping progress includes only active recipe/restock rows and household extras. Checked rows that have left the active list cannot inflate the collected count. Extras are included in progress but excluded from the budget estimate. Saved Cook Lineup ingredients can build a shopping list even without a generated plan. Older meals without stored ingredients show a notice that their shopping requirements are missing.

Cooked It records a completed dinner or dessert and removes it from the active lineup. Counts use the local calendar week beginning Monday and exclude invalid or future timestamps. Cooking history is stored locally under a separate key for each signed-in account or guest. It does not sync across devices and cannot reconstruct cooking events from before this feature. This limitation is visible on the dashboard.

Dashboard actions open the relevant mobile view at the top. Desktop actions scroll to the corresponding section. Open shopping list expands the list; Recipe Vault opens the library.

Validation: Node 22, `npm run test:grocery`, `npm run test:week`, TypeScript, production build, and browser checks of both mobile and desktop layouts, restored dinner/dessert data, and checkbox progress updates.
