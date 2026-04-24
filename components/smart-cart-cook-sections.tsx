"use client";

type IngredientItem = {
  name: string;
  amount: string;
  price?: number;
};

type MealPlanItem = {
  dbId?: number | string;
  user_id: string;
  day: string;
  name: string;
  servings: number;
  notes: string;
  ingredients?: IngredientItem[];
};

type RecipeCacheEntry = {
  ingredients: string[];
};

type SmartCartCookSectionsProps = {
  expandedDetailCards: Set<string>;
  expandedIngredientsMeals: Set<string>;
  formatCardEyebrow: (day: string) => string;
  onArchiveMeal: (meal: MealPlanItem) => void | Promise<void>;
  onGetRecipe: (meal: MealPlanItem) => void | Promise<void>;
  onPermanentDelete: (meal: MealPlanItem) => void | Promise<void>;
  onRemoveFromWeeklyMenu: (meal: MealPlanItem) => void | Promise<void>;
  onToggleCardDetails: (cardKey: string) => void;
  onToggleIngredients: (meal: MealPlanItem) => void | Promise<void>;
  recipeCache: Record<string, RecipeCacheEntry>;
  recipeLoadingMeal: string | null;
  savedDesserts: MealPlanItem[];
  weeklyMenu: MealPlanItem[];
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartCookSections({
  expandedDetailCards,
  expandedIngredientsMeals,
  formatCardEyebrow,
  onArchiveMeal,
  onGetRecipe,
  onPermanentDelete,
  onRemoveFromWeeklyMenu,
  onToggleCardDetails,
  onToggleIngredients,
  recipeCache,
  recipeLoadingMeal,
  savedDesserts,
  weeklyMenu,
}: SmartCartCookSectionsProps) {
  const hasCookPlan = weeklyMenu.length > 0 || savedDesserts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[2.25rem] border border-pine/15 bg-[#f8f4ec] p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pine/65">
              Cook
            </p>
            <p className="font-display text-2xl text-ink">Your cook-ready lineup</p>
            <p className="mt-1 text-sm leading-6 text-ink/70">
              Meals you save to menu land here so your recipes are ready when it is time to cook.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-pine shadow-sm">
            {weeklyMenu.length + savedDesserts.length} ready
          </span>
        </div>

        {!hasCookPlan ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-pine/20 bg-white px-4 py-10 text-center text-ink/60">
            <p className="font-display text-2xl text-ink">Nothing saved for cooking yet</p>
            <p className="mt-3 text-sm leading-7">
              Tap <strong>Save to Menu</strong> on meals or desserts you want to cook this week.
            </p>
          </div>
        ) : null}

        {weeklyMenu.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {weeklyMenu.map((meal, index) => (
              <article
                key={`saved-${meal.day}-${meal.name}`}
                className="rounded-3xl border border-stone-200 bg-white px-4 py-4 shadow-lg"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                  {index < 7 ? `DAY ${index + 1}` : "BONUS MEAL"}
                </p>
                <h3 className="mt-2 font-display text-xl text-ink">{safeTrim(meal.name)}</h3>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm leading-6 text-ink/70">Serves {meal.servings}</p>
                </div>
                {expandedDetailCards.has(`saved-${meal.day}::${meal.name}`) ? (
                  <p className="mt-3 text-sm leading-7 text-ink/75">{safeTrim(meal.notes)}</p>
                ) : null}
                <button
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-orange-50"
                  onClick={() => onToggleCardDetails(`saved-${meal.day}::${meal.name}`)}
                  type="button"
                >
                  {expandedDetailCards.has(`saved-${meal.day}::${meal.name}`)
                    ? "Hide Details"
                    : "Show Details"}
                </button>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={recipeLoadingMeal === meal.name}
                    onClick={() => void onGetRecipe(meal)}
                    type="button"
                  >
                    {recipeLoadingMeal === meal.name ? "Loading recipe..." : "Get Recipe"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={recipeLoadingMeal === meal.name}
                    onClick={() => void onToggleIngredients(meal)}
                    type="button"
                  >
                    {expandedIngredientsMeals.has(`${meal.day}::${meal.name}`)
                      ? "Hide Ingredients"
                      : "View Ingredients"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-stone-200"
                    onClick={() => void onArchiveMeal(meal)}
                    type="button"
                  >
                    Stash in Vault
                  </button>
                  <button
                    className="col-span-2 inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 sm:col-span-1"
                    onClick={() => void onRemoveFromWeeklyMenu(meal)}
                    type="button"
                  >
                    Remove from Menu
                  </button>
                </div>
                {expandedIngredientsMeals.has(`${meal.day}::${meal.name}`) &&
                ((meal.ingredients && meal.ingredients.length > 0) || recipeCache[meal.name]) ? (
                  <div className="mt-4 rounded-[1rem] bg-cream px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                      Ingredients
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/75">
                      {(meal.ingredients && meal.ingredients.length > 0
                        ? meal.ingredients
                            .filter(
                              (ingredient) =>
                                ingredient &&
                                typeof ingredient.name === "string" &&
                                typeof ingredient.amount === "string",
                            )
                            .map(
                              (ingredient) =>
                                `${safeTrim(ingredient.amount)} ${safeTrim(ingredient.name)}`,
                            )
                        : (recipeCache[meal.name]?.ingredients ?? []).filter(
                            (ingredient) => typeof ingredient === "string",
                          )
                      )
                        .map((ingredient) => safeTrim(ingredient))
                        .filter(Boolean)
                        .map((ingredient) => (
                          <li key={`${meal.name}-${ingredient}`} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-berry" />
                            <span>{ingredient}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {savedDesserts.length > 0 ? (
        <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/80">
                Sweet treat
              </p>
              <p className="font-display text-2xl text-ink">Saved Desserts</p>
              <p className="mt-1 text-sm leading-6 text-ink/70">
                Keep your favorite sweet treats with this week&apos;s cook-ready plan.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-berry">
              {savedDesserts.length} saved
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {savedDesserts.map((meal, index) => {
              const mealKey = `${safeTrim(meal.day)}::${safeTrim(meal.name)}`;

              return (
                <article
                  key={`saved-dessert-${meal.dbId ?? `${mealKey}-${index}`}`}
                  className="overflow-hidden rounded-3xl border border-stone-200 bg-[#fffdf9] shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                        {formatCardEyebrow(safeTrim(meal.day))}
                      </p>
                      <h3 className="mt-2 font-display text-[1.45rem] leading-tight text-ink sm:text-2xl">
                        {safeTrim(meal.name)}
                      </h3>
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-ink/55">
                      Serves {meal.servings}
                    </span>
                  </div>

                  <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
                    {expandedDetailCards.has(`saved-dessert-${mealKey}`) ? (
                      <p className="text-sm leading-7 text-ink/75">{safeTrim(meal.notes)}</p>
                    ) : null}
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-200"
                      onClick={() => onToggleCardDetails(`saved-dessert-${mealKey}`)}
                      type="button"
                    >
                      {expandedDetailCards.has(`saved-dessert-${mealKey}`)
                        ? "Hide Details"
                        : "Show Details"}
                    </button>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={recipeLoadingMeal === safeTrim(meal.name)}
                        onClick={() => void onGetRecipe(meal)}
                        type="button"
                      >
                        {recipeLoadingMeal === safeTrim(meal.name)
                          ? "Loading recipe..."
                          : "Get Recipe"}
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-orange-50"
                        onClick={() => onToggleIngredients(meal)}
                        type="button"
                      >
                        {expandedIngredientsMeals.has(mealKey)
                          ? "Hide Ingredients"
                          : "View Ingredients"}
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-200"
                        onClick={() => void onArchiveMeal(meal)}
                        type="button"
                      >
                        Stash in Vault
                      </button>
                      <button
                        className="col-span-2 inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 sm:col-span-1"
                        onClick={() => void onPermanentDelete(meal)}
                        type="button"
                      >
                        Remove entirely
                      </button>
                    </div>
                    {expandedIngredientsMeals.has(mealKey) && (meal.ingredients ?? []).length > 0 ? (
                      <div className="rounded-[1rem] bg-cream px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                          Ingredients
                        </p>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/75">
                          {(meal.ingredients ?? [])
                            .filter(
                              (ingredient) =>
                                ingredient &&
                                typeof ingredient.name === "string" &&
                                typeof ingredient.amount === "string",
                            )
                            .map((ingredient) => (
                              <li
                                key={`${safeTrim(meal.name)}-${safeTrim(ingredient.name)}-${safeTrim(ingredient.amount)}`}
                                className="flex gap-2"
                              >
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-berry" />
                                <span>
                                  {safeTrim(ingredient.amount)} {safeTrim(ingredient.name)}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
