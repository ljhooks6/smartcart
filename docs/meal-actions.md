# Clear meal actions

Dinner and Sweet Treat cards share View Recipe, Add to This Week, and Save to Vault in the same order. View Recipe is the primary action. Replace, ingredient details, and Cooked It remain secondary.

This Week drives the Cook Lineup and grocery list. Cook cards show a disabled In This Week action so it is clear that the meal is already included. Vault cards show Saved to Vault. A full five-dinner lineup cannot accept another dinner; restoring a Vault meal at capacity keeps it safely in the Vault. Sweet Treats retain their separate capacity behavior.

Save to Vault keeps the existing move behavior: it removes the meal from the active plan and This Week after a successful cloud save. The confirmation and Vault guidance explain this. Generated Sweet Treats now have the same Vault action as dinners and are removed from generated options after saving. Existing confirmation preferences and success feedback are retained.

No database schema or authentication changes.
