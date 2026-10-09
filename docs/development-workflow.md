# Development workflow

The owner has authorized automatically committing, pushing, and deploying completed MealCaddie changes to production when the relevant checks pass. Do not ask for deployment confirmation again for those tested changes. This preference was explicitly set on October 10, 2026.

Use the project's required Node 22 runtime. Run the production build and checks appropriate to each change, verify the affected flow locally, push to the existing main branch, and verify that Vercel is READY on mealcaddie.app. If a check fails, resolve it before release.
