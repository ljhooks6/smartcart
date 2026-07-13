# MealCaddie Post-Move Experience Roadmap

Resume this roadmap after the move to Dallas, getting settled, and moving development to the new computer.

## Recommended Order

### 1. Grocery and Recipe Reliability

- Make the recipe ingredient the single source of truth for grocery item names, types, and quantities.
- Preserve specific ingredient formats such as macaroni, spaghetti, jasmine rice, and yellow onion.
- Combine only true duplicates and retain the combined quantity.
- Strengthen pantry matching so owned ingredients do not return to the active shopping list.
- Clearly separate active, skipped, removed, and already-owned items.
- Test grocery lists against full real-world meal plans before release.

### 2. Weekly Dashboard and Planning Handoff

- Add a clear "Your Week" dashboard connecting planning, shopping, cooking, and saved meals.
- Show meals planned, grocery progress, and meals cooked.
- After generation, summarize the result, for example: "5 dinners planned, 3 pantry ingredients used, 14 items needed."
- Use one clear primary action after generation: "Review Your Week."
- Always place the user at the top of the destination page after moving to the next stage.

### 3. Store Mode

- Add a focused mobile shopping view with large checkboxes and minimal distractions.
- Organize navigation by grocery department rather than alphabetically.
- Show shopping progress, such as "12 of 18 collected."
- Allow undo after checking or removing an item.
- Consider automatically advancing to the next incomplete department.
- Keep ingredient use and associated meal details available behind a compact details interaction.

### 4. Clear Meal Actions

- Give every meal a consistent action hierarchy: "View Recipe," "Add to This Week," and "Save to Vault."
- Keep Cook Lineup and Vault language distinct everywhere.
- Apply all relevant dinner improvements to Sweet Treats at the same time.
- Continue showing confirmations and friendly success animations without creating repetitive friction.

### 5. First-Use Guidance

- Add short, dismissible guidance for the Cook Lineup, Vault, and grocery list.
- Reuse the "Don't show this again" preference pattern.
- Avoid a long introductory tutorial; teach features when the user first reaches them.

### 6. Recovery and Reassurance

- Add undo after removing meals, desserts, or grocery items.
- Make saved and autosaved states visible.
- Preserve page position and user context unless moving to a new workflow stage.
- Ensure clear actions work on the first press and provide immediate feedback.

### 7. Better Waiting States

- Replace generic loading states with meaningful progress messages.
- Suggested sequence: "Checking your pantry," "Building your meals," and "Organizing your grocery list."
- Prevent accidental duplicate generation while a request is running.
- Review production startup and generation performance on the new workstation.

## Future Features Already Discussed

- Breakfast and lunch planning with user-selected meal types.
- Saving personal recipes and importing recipes from websites or social media.
- Continue refining meaningful Free and Plus distinctions without weakening the core Free experience.

## Product Principle

MealCaddie should feel like one calm, connected journey from pantry to plan, store, and table. Prioritize trust, clarity, and reduced mental load before expanding the feature set.
