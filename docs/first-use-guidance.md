# First-use guidance

Cook, Vault, and Shop each show a short inline guide when that view is first reached. Guides do not block actions, require a walkthrough, or appear inside Store Mode. Dinner and Sweet Treat guidance is shared.

Got it hides that guide for the current visit. Selecting Don't show this again before Got it remembers the choice on this browser using mealcaddie-first-use-guidance-v1. Each view is independent, and mobile and desktop share the same preferences. A reload brings back guides dismissed without the checkbox. Preferences are read before guides render to avoid flashing a previously dismissed guide.

Only validated boolean preferences are loaded. Missing, malformed, or blocked storage keeps guidance usable; blocked storage still allows dismissal for the visit. Existing meal-action confirmation preferences are unchanged. No account or database changes.
