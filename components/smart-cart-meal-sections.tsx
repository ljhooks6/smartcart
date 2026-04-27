"use client";

import type { SmartCartPlan } from "@/lib/smart-cart-membership";

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
  imageUrl?: string;
};

type GeneratedDessert = {
  title: string;
  description: string;
  ingredients: IngredientItem[];
  imageUrl?: string;
};

type GeneratedPlan = {
  meals: MealPlanItem[];
  desserts: GeneratedDessert[];
};

type RecipeCacheEntry = {
  ingredients: string[];
};

type SmartCartMealSectionsProps = {
  expandedDetailCards: Set<string>;
  expandedIngredientsMeals: Set<string>;
  formatCardEyebrow: (day: string) => string;
  generatedPlan: GeneratedPlan;
  householdSize: number;
  onArchiveMeal: (meal: MealPlanItem) => void | Promise<void>;
  onGetDessertRecipe: (dessert: GeneratedDessert, index: number) => void | Promise<void>;
  onGetRecipe: (meal: MealPlanItem) => void | Promise<void>;
  onReplaceDessert: (dessert: GeneratedDessert, index: number) => void | Promise<void>;
  onReplaceMeal: (meal: MealPlanItem, index: number) => void | Promise<void>;
  onSaveToWeeklyMenu: (meal: MealPlanItem) => void;
  onToggleCardDetails: (cardKey: string) => void;
  onToggleDessertSave: (dessert: GeneratedDessert, index: number) => void;
  onToggleIngredients: (meal: MealPlanItem) => void | Promise<void>;
  recipeCache: Record<string, RecipeCacheEntry>;
  recipeLoadingMeal: string | null;
  replacingDessertKey: string | null;
  replacingMealKey: string | null;
  savedDessertKeys: Set<string>;
  savedMealKeys: Set<string>;
  userPlan: SmartCartPlan;
  userId: string;
  weeklyMenuCount: number;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartMealSections({
  expandedDetailCards,
  expandedIngredientsMeals,
  formatCardEyebrow,
  generatedPlan,
  householdSize,
  onArchiveMeal,
  onGetDessertRecipe,
  onGetRecipe,
  onReplaceDessert,
  onReplaceMeal,
  onSaveToWeeklyMenu,
  onToggleCardDetails,
  onToggleDessertSave,
  onToggleIngredients,
  recipeCache,
  recipeLoadingMeal,
  replacingDessertKey,
  replacingMealKey,
  savedDessertKeys,
  savedMealKeys,
  userPlan,
  userId,
  weeklyMenuCount,
}: SmartCartMealSectionsProps) {
  return (
    <div className="lg:col-span-8 flex flex-col gap-6">
      <div className="rounded-[2.25rem] border border-stone-200 bg-white/85 p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
              Meals
            </p>
            <p className="font-display text-3xl text-ink">Your 7 dinner picks</p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-sky-200 bg-gradient-to-r from-sky-50 to-white px-4 py-4 text-sm text-sky-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Save-to-menu flow
          </p>
          <p className="mt-2 font-semibold">
            Tap <strong>Save to Menu</strong> on the meals you want this week. Saved meals move to
            your <strong>Cook</strong> page and drive your shopping list.
          </p>
          {userPlan === "free" ? (
            <p className="mt-2 text-sm leading-6 text-sky-900/80">
              Core weekly meal generation is the same for everyone today. <strong>SmartCart
              Plus</strong> adds pantry memory, a bigger vault, and smarter replacements that do
              a better job avoiding repeat meal patterns.
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {generatedPlan.meals.map((meal, index) => {
            const mealCardKey = `generated-${meal.day}::${meal.name}`;
            const mealEyebrow = formatCardEyebrow(meal.day);
            return (
              <article
                key={`${meal.day}-${meal.name}-${index}`}
                className="overflow-hidden rounded-3xl border border-stone-200 bg-[#fffdf9] shadow-xl"
              >
                <div className="flex items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                      {mealEyebrow}
                    </p>
                    <h2 className="mt-2 font-display text-[1.45rem] leading-tight text-ink sm:text-2xl">
                      {safeTrim(meal.name)}
                    </h2>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-ink/55">
                    Serves {meal.servings}
                  </span>
                </div>

                <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
                  {expandedDetailCards.has(mealCardKey) ? (
                    <p className="text-sm leading-7 text-ink/75">{safeTrim(meal.notes)}</p>
                  ) : null}
                  <button
                    className="inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink transition hover:bg-stone-200"
                    onClick={() => onToggleCardDetails(mealCardKey)}
                    type="button"
                  >
                    {expandedDetailCards.has(mealCardKey) ? "Hide Details" : "Show Details"}
                  </button>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                    <button
                      className={`inline-flex items-center justify-center rounded-full px-3 py-2.5 text-sm font-semibold transition ${
                        savedMealKeys.has(`${meal.day}::${meal.name}`)
                          ? "bg-orange-500 text-white"
                          : weeklyMenuCount >= 5
                            ? "bg-stone-100 text-stone-400"
                            : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                      }`}
                      disabled={weeklyMenuCount >= 5 && !savedMealKeys.has(`${meal.day}::${meal.name}`)}
                      onClick={() => onSaveToWeeklyMenu(meal)}
                      type="button"
                    >
                      {savedMealKeys.has(`${meal.day}::${meal.name}`)
                        ? "Saved"
                        : weeklyMenuCount >= 5
                          ? "Menu Full"
                          : "Save to Menu"}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-stone-200"
                      onClick={() => void onArchiveMeal(meal)}
                      type="button"
                    >
                      Stash in Vault
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={replacingMealKey === `${meal.day}::${meal.name}`}
                      onClick={() => void onReplaceMeal(meal, index)}
                      type="button"
                    >
                      {replacingMealKey === `${meal.day}::${meal.name}` ? "Replacing..." : "Replace"}
                    </button>
                    <button
                      className="col-span-2 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1"
                      disabled={
                        recipeLoadingMeal === meal.name ||
                        replacingMealKey === `${meal.day}::${meal.name}`
                      }
                      onClick={() => void onGetRecipe(meal)}
                      type="button"
                    >
                      {recipeLoadingMeal === meal.name ? "Loading recipe..." : "Get Recipe"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {generatedPlan.desserts.length > 0 ? (
        <section className="mt-6 rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/80">
            Sweet Treat
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {generatedPlan.desserts.map((dessert, index) => {
              const isDessertSaved = savedDessertKeys.has(dessert.title);
              const isReplacingThisDessert = replacingDessertKey === `${dessert.title}-${index}`;
              const dessertCardKey = `dessert-${dessert.title}-${index}`;
              return (
                <article
                  key={dessertCardKey}
                  className="overflow-hidden rounded-[1.5rem] border border-rose-200 bg-white p-4 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                        SWEET TREAT
                      </p>
                      <h3 className="mt-3 font-display text-2xl text-ink">
                        {safeTrim(dessert.title)}
                      </h3>
                    </div>
                  </div>
                  {expandedDetailCards.has(dessertCardKey) ? (
                    <p className="mt-3 text-sm leading-7 text-ink/80">
                      {safeTrim(dessert.description)}
                    </p>
                  ) : null}
                  <button
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-200"
                    onClick={() => onToggleCardDetails(dessertCardKey)}
                    type="button"
                  >
                    {expandedDetailCards.has(dessertCardKey) ? "Hide Details" : "Show Details"}
                  </button>
                  <button
                    className="mt-4 ml-3 inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-orange-50"
                    onClick={() =>
                      void onToggleIngredients({
                        user_id: safeTrim(userId),
                        day: `Sweet Treat ${index + 1}`,
                        name: dessert.title,
                        servings: householdSize || 2,
                        notes: dessert.description,
                        ingredients: dessert.ingredients,
                        imageUrl: dessert.imageUrl,
                      })
                    }
                    type="button"
                  >
                    {expandedIngredientsMeals.has(`Sweet Treat ${index + 1}::${dessert.title}`)
                      ? "Hide Ingredients"
                      : "View Ingredients"}
                  </button>
                  {expandedIngredientsMeals.has(`Sweet Treat ${index + 1}::${dessert.title}`) ? (
                    <div className="mt-4 w-full rounded-[1rem] bg-cream px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                        Ingredients
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/75">
                        {dessert.ingredients
                          .filter(
                            (ingredient) =>
                              ingredient &&
                              typeof ingredient.name === "string" &&
                              typeof ingredient.amount === "string",
                          )
                          .map((ingredient) => (
                            <li
                              key={`${dessert.title}-${ingredient.name}-${ingredient.amount}`}
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
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                    <button
                      className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition ${
                        isDessertSaved
                          ? "bg-orange-500 text-white"
                          : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                      }`}
                      onClick={() => onToggleDessertSave(dessert, index)}
                      type="button"
                    >
                      {isDessertSaved ? "Saved" : "Save Dessert"}
                    </button>
                    <button
                      className="col-span-2 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1"
                      disabled={recipeLoadingMeal === dessert.title || isReplacingThisDessert}
                      onClick={() => void onGetDessertRecipe(dessert, index)}
                      type="button"
                    >
                      {recipeLoadingMeal === dessert.title ? "Loading recipe..." : "Get Recipe"}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isReplacingThisDessert}
                      onClick={() => void onReplaceDessert(dessert, index)}
                      type="button"
                    >
                      {isReplacingThisDessert ? "Replacing..." : "Replace"}
                    </button>
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
