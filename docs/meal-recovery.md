# Meal recovery

Cooked It offers persistent Undo feedback for the latest dinner or Sweet Treat marked cooked. Undo returns the meal to its original position in This Week, restores its derived grocery needs, and removes only that action's cooking entry from the device's history. Existing grocery checkmarks are retained. Meals added after removal stay in the lineup.

Undo stays available across views until used, dismissed, or replaced by a newer Cooked It action. It is visit-only and clears on reload, account changes, workspace reset, or successful plan generation. If five dinners fill This Week before recovery, the pending meal is retained and the message asks the user to make room. Sweet Treats remain a separate collection.

Permanent Delete is unchanged and cannot be recovered by this Undo. Save to Vault retains its existing recovery through Add to This Week.

Validation includes dinner/Sweet Treat recovery, grocery and cooked-count updates, original ordering, duplicate prevention, and full-lineup handling.
