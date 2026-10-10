# Clear meal actions

Meal and Sweet Treat cards show View Recipe and, when available, Add to This Week. More contains Save to Vault, extra details, Replace, or Cooked It as appropriate. Chosen meals show Cook on and View Recipe; they do not repeat a disabled In This Week button. Ingredients are available inside the interactive recipe. Vault cards use the same primary actions and keep permanent deletion under More with the existing confirmation behavior.

This Week drives the Cook Lineup and grocery list. Cook cards show the meal type and chosen cooking day. Vault cards show Saved to Vault. Capacity remains five meals per breakfast, lunch, or dinner category; restoring a Vault meal at capacity keeps it safely in the Vault. Sweet Treats retain their separate capacity behavior.

Save to Vault keeps the existing move behavior: it removes the meal from the active plan and This Week after a successful cloud save. The confirmation and Vault guidance explain this. Generated Sweet Treats now have the same Vault action as dinners and are removed from generated options after saving. Existing confirmation preferences and success feedback are retained.

No database schema or authentication changes.

Meals is a selection screen: Show Details is visible directly on every meal and treat card, with Add to This Week below. Recipes open from Cook or Vault. Secondary Save to Vault and Replace actions remain under More.
