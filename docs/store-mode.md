# Store Mode

Enter Store Mode from Shop or the desktop grocery list. A full-screen native dialog keeps the shopping list separate from planning controls. It traps focus, supports Escape to exit, and restores the surrounding page when closed.

Departments follow the existing grocery department order. Choose a department chip or use Previous / Next department. Checkboxes have large tap targets, and quantities remain visible. Expand Meal & ingredient details for the associated dinners or desserts and ingredient usage notes. Household extras appear in their own department.

Collection progress counts only active grocery rows and extras. Removed rows, pantry exclusions, and stale checked keys are not counted. Collected items remain visible by default; Only show items to collect can hide them. Completion messages appear per department and for the full list.

Undo reverses the latest shopping action, including checks, removals, pantry add-backs, and household changes. It preserves the previous checked state and item order. Undo is shared with the normal shopping view and has no timer during the current visit. A subsequent shopping action replaces the undo entry; a reload clears undo.

Shopping checks, removals, pantry add-backs, and extras persist on the device under a versioned key scoped to the signed-in account or guest. They do not sync across devices. Generating a new plan or resetting the workspace clears this progress. Storage failures leave the current visit usable.

Validation uses Node 22, `npm run test:shopping`, the grocery and week suites, TypeScript, and the production build. Browser checks cover collecting and removing ingredients, undo preserving checked state, department navigation, meal details, reload persistence, and household extras.
