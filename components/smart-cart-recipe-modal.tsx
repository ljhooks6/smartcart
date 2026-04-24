"use client";

type MealPlanItem = {
  name: string;
};

type RecipeResponse = {
  title: string;
  prep_time_minutes: number;
  ingredients: string[];
  steps: string[];
};

type SmartCartRecipeModalProps = {
  activeRecipe: RecipeResponse | undefined;
  activeRecipeMeal: MealPlanItem | null;
  onClose: () => void;
  recipeError: string | null;
  recipeLoadingMeal: string | null;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartRecipeModal({
  activeRecipe,
  activeRecipeMeal,
  onClose,
  recipeError,
  recipeLoadingMeal,
}: SmartCartRecipeModalProps) {
  if (!activeRecipeMeal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 px-4 py-8 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
        <button
          aria-label="Close recipe"
          className="absolute right-4 top-4 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-cream"
          onClick={onClose}
          type="button"
        >
          Close
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
          Recipe detail
        </p>
        <h3 className="mt-3 max-w-xl font-display text-3xl text-ink">
          {activeRecipeMeal.name}
        </h3>

        {recipeLoadingMeal === activeRecipeMeal.name && !activeRecipe ? (
          <div className="mt-6 rounded-[1.5rem] border border-pine/10 bg-cream px-5 py-6 text-sm text-ink/70">
            Building a fast, step-by-step recipe...
          </div>
        ) : recipeError ? (
          <div className="mt-6 rounded-[1.5rem] border border-berry/20 bg-berry/10 px-5 py-6 text-sm text-berry">
            {recipeError}
          </div>
        ) : activeRecipe ? (
          <div className="mt-6 space-y-6">
            <div className="rounded-[1.5rem] bg-pine px-5 py-4 text-cream">
              <p className="text-xs uppercase tracking-[0.2em] text-cream/75">Prep time</p>
              <p className="mt-2 font-display text-2xl">
                {activeRecipe.prep_time_minutes} minutes
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[1.5rem] border border-pine/10 bg-cream px-5 py-5">
                <p className="font-display text-2xl text-pine">Ingredients</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/80">
                  {activeRecipe.ingredients
                    .filter((ingredient) => typeof ingredient === "string")
                    .map((ingredient) => safeTrim(ingredient))
                    .filter(Boolean)
                    .map((ingredient) => (
                      <li key={ingredient} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-berry" />
                        <span>{ingredient}</span>
                      </li>
                    ))}
                </ul>
              </section>

              <section className="rounded-[1.5rem] border border-ink/10 bg-[#fffaf4] px-5 py-5">
                <p className="font-display text-2xl text-ink">Steps</p>
                <ol className="mt-4 space-y-4 text-sm leading-7 text-ink/80">
                  {activeRecipe.steps
                    .filter((step) => typeof step === "string")
                    .map((step) => safeTrim(step))
                    .filter(Boolean)
                    .map((step, index) => (
                      <li
                        key={`${activeRecipe.title}-step-${index + 1}`}
                        className="flex gap-4"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-apricot/20 text-xs font-semibold text-berry">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                </ol>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
