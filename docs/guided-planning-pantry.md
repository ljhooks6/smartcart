# Guided planning and pantry decisions

The Plan tab shows Budget, Household, Preferences, Pantry and equipment, Dinner and sweet treats, then Review. Earlier steps remain reachable. The device stores the step and answers under the current owner or guest key. First-time signed-in users start with their household preferences. Returning users can jump to review from Budget. Legacy unowned planning answers are left in storage and never automatically assigned to another owner.

Planning with shopping allowed accepts an empty pantry. Pantry-only suggestions still require an ingredient and a quantity check before cooking. The planner sends the existing generation request and preserves current entitlements and safety checks. Sweet treats are optional, and only selected dinners and treats affect shopping requirements. Prices and package sizes stay unverified where unavailable.

Shop and Store Mode use the same deterministic calculation. Aggregate selected recipe requirements by safe ingredient identity, subtract compatible measured inventory once, and classify each item as Need to Buy, Check Pantry, or Already Covered. Restock intentions remain purchases even when the recipes are covered. Unknown amounts, incompatible measurements and ambiguous ingredients require review. An explicit purchase decision moves the item to Need to Buy without inventing a shortage. No action here decrements inventory.

The optional quick check starts with up to three questions, prioritizing low stock and ingredients used by more meals. Review more opens remaining questions, and Skip for now leaves unresolved items visible. Answers are device-local and owner-scoped. A changed ingredient requirement or pantry measurement invalidates its answer. Existing manual items and shopping progress remain in the same storage format with an additive pantry decision field.

Pantry row removal restores focus to an adjacent row, its category, or the search controls. It preserves the current scroll offset when the new layout allows it.
