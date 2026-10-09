# Generation progress

A modal waiting state shows confirmed milestones: pantry inputs validated, meal request in progress, and returned ingredients being organized. It does not infer server progress from elapsed time or display a made-up percentage. A slower-request message appears after 20 seconds while the actual request remains active. Dinner-only and Sweet Treat plans have matching wording.

A synchronous in-flight guard protects all plan submissions before React can disable buttons. Generate and Clear are disabled while work runs. The modal keeps keyboard focus inside, blocks background actions, and respects reduced-motion preferences. Success closes it and keeps the existing Review Your Week handoff. Errors and the existing 65-second timeout release the guard and allow retry; the previous generated plan remains available.

No changes to the generation API or model prompts. Local production build, duplicate-request guard, waiting UI, result handoff, and retry behavior should be checked before release.
