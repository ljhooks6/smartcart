# Cooking days and interactive recipes

Adding a meal from Meals or Vault opens Plan this meal, where users choose Monday through Sunday or Decide later. Cook on can change that choice afterward. The home preview and Cook list sort scheduled meals Monday through Sunday, followed by flexible meals; multiple meal types may share a day.

`scheduledDay` is separate from the generated `day` identifier. Source IDs, breakfast/lunch/dinner classification, recipe quantities, duplicate detection, and grocery derivation retain their original values. Older meals are flexible until the user chooses a day. Guest weeks store this field locally. Signed-in weeks include it in the existing recipe JSON and recovery draft; Save Week syncs it through the existing atomic save RPC. No database migration is needed.

Recipes provide ingredient checkoffs and Cook Along with one step at a time, Previous, Done & next, and an expandable checklist of all steps. Cooked It is available for meals in This Week and retains the existing reminder and Undo flow. Checking recipe ingredients or steps does not mark shopping items collected or automatically mark a meal cooked. Switching between ingredients and steps starts at the top of the dialog content; Close remains fixed.

Recipes and progress are cached on this device in separate signed-in account or guest storage, keeping the most recent 20 recipes. Cache identity includes name, notes, servings, and ingredient quantities; changing the cooking day does not invalidate it. Reopening resumes checkoffs, and Continue cooking starts at the first incomplete step. Reset recipe progress clears only these checkoffs. Storage failures show a message. An incomplete recipe response is rejected, and stale requests cannot overwrite a newly opened recipe or another account’s state.

Validation includes 39 regression tests, production build, local browser checks for adding/rescheduling/reloading, ingredient and step checkoffs, guided completion and the Cooked It reminder, and viewport checks. The atomic save SQL was exercised in isolated PGlite with weekday choices for all meal types and ownership isolation. No production test rows were written.
