"use client";

import { SmartCartMealDetails } from "./smart-cart-meal-details";

import { SmartCartMealActions } from "./smart-cart-meal-actions";
import { getMealKind, mealKindLabel, hasRoomForMeal } from "../lib/meal-types";
import type { SmartCartPlan } from "@/lib/smart-cart-membership";
import { mealMatchesCuisinePreference } from "@/lib/meal-request-normalization";

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

type SmartCartMealSectionsProps = {
  cuisinePreference: string;
  expandedDetailCards: Set<string>;
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
  recipeLoadingMeal: string | null;
  replacingDessertKey: string | null;
  replacingMealKey: string | null;
  savedDessertKeys: Set<string>;
  savedMealKeys: Set<string>;
  userPlan: SmartCartPlan;
  userId: string;
  weeklyMenu: MealPlanItem[];
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartMealSections({
  cuisinePreference,
  expandedDetailCards,
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
  recipeLoadingMeal,
  replacingDessertKey,
  replacingMealKey,
  savedDessertKeys,
  savedMealKeys,
  userPlan,
  userId,
  weeklyMenu,
}: SmartCartMealSectionsProps) {
  return (
    <div className="lg:col-span-8 flex flex-col gap-6">
      <div className="md:rounded-[2.25rem] md:border md:border-stone-200 md:bg-white/85 md:p-6 md:shadow-xl md:backdrop-blur">
        <div className="hidden md:flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
              Meals
            </p>
            <p className="font-display text-3xl text-ink">Your meal options</p>
          </div>
        </div>

        <div className="hidden md:block mt-5 rounded-[1.5rem] border border-sky-200 bg-gradient-to-r from-sky-50 to-white px-4 py-4 text-sm text-sky-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Cook lineup flow
          </p>
          <p className="mt-2 font-semibold">
            Tap <strong>Add to This Week</strong> on the meals you want this week. Chosen meals
            move to your <strong>Cook</strong> page and drive your shopping list.
          </p>
          {userPlan === "free" ? (
            <p className="mt-2 text-sm leading-6 text-sky-900/80">
              Free helps you plan this week. <strong>MealCaddie Plus</strong> remembers your pantry,
              unlocks cuisine personalization, expands your vault, and runs a stronger refinement
              pass for better variety, balance, and smarter swaps.
            </p>
          ) : null}
        </div>

        <p className="mb-4 text-sm text-ink/60 md:hidden">Choose meals for This Week to build your shopping list.</p>
        <div className="md:mt-6 space-y-6">
          {(["dinner", "breakfast", "lunch"] as const).map((kind) => {
            const options = generatedPlan.meals.map((meal, index) => ({ meal, index })).filter(({ meal }) => getMealKind(meal) === kind);
            if (!options.length) return null;
            return <section key={kind} aria-label={`${mealKindLabel(kind)} options`}>
              <h2 className="mb-4 font-display text-2xl text-ink">{mealKindLabel(kind)} · {options.length} options</h2>
              <div className="grid gap-4 md:grid-cols-2">
          {options.map(({ meal, index }) => {
            const mealCardKey = `generated-${meal.day}::${meal.name}`;
            const matchesCuisinePreference = mealMatchesCuisinePreference(cuisinePreference, meal);
            return (
              <article
                key={`${meal.day}-${meal.name}-${index}`}
                className="overflow-hidden rounded-3xl border border-pine/15 border-t-4 border-t-apricot bg-white shadow-xl"
              >
                <div className="flex items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                      {mealKindLabel(kind)} option
                    </p>
                    {matchesCuisinePreference ? (
                      <p className="mt-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-800 shadow-sm">
                        Matches Your Cuisine Vibe
                      </p>
                    ) : null}
                    <h2 className="mt-2 font-display text-[1.45rem] leading-tight text-ink sm:text-2xl">
                      {safeTrim(meal.name)}
                    </h2>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-ink/55">
                    Serves {meal.servings}
                  </span>
                </div>

                <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
                  <SmartCartMealActions
                    inThisWeek={savedMealKeys.has(`${meal.day}::${meal.name}`)}
                    weekFull={!hasRoomForMeal(weeklyMenu, meal)}
                    recipeLoading={recipeLoadingMeal === meal.name}
                    busy={replacingMealKey === `${meal.day}::${meal.name}`}
                    onViewRecipe={() => void onGetRecipe(meal)}
                    onAddToWeek={() => onSaveToWeeklyMenu(meal)}
                    onSaveToVault={() => void onArchiveMeal(meal)}
                    more={<> <SmartCartMealDetails expanded={expandedDetailCards.has(mealCardKey)} onToggle={() => onToggleCardDetails(mealCardKey)} notes={safeTrim(meal.notes)} /> <button className="min-h-11 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60" disabled={replacingMealKey === `${meal.day}::${meal.name}`} onClick={() => void onReplaceMeal(meal, index)} type="button">
                    {replacingMealKey === `${meal.day}::${meal.name}` ? "Replacing..." : "Replace"}
                  </button> </>}
                  />

                </div>
              </article>
            );
          })}
              </div>
            </section>;
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
                  className="overflow-hidden rounded-[1.5rem] border border-berry/15 border-t-4 border-t-berry bg-white p-4 shadow-md"
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
                  <div className="mt-4">
                    <SmartCartMealActions
                      inThisWeek={isDessertSaved}
                      recipeLoading={recipeLoadingMeal === dessert.title}
                      busy={isReplacingThisDessert}
                      more={<><SmartCartMealDetails expanded={expandedDetailCards.has(dessertCardKey)} onToggle={() => onToggleCardDetails(dessertCardKey)} notes={safeTrim(dessert.description)} /><button className="mt-3 min-h-11 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60" disabled={isReplacingThisDessert} onClick={() => void onReplaceDessert(dessert, index)} type="button">
                      {isReplacingThisDessert ? "Replacing..." : "Replace"}
                    </button></>}
                      onViewRecipe={() => void onGetDessertRecipe(dessert, index)}
                      onAddToWeek={() => onToggleDessertSave(dessert, index)}
                      onSaveToVault={() => void onArchiveMeal({ user_id: safeTrim(userId), day: `Sweet Treat ${index + 1}`, name: dessert.title, servings: householdSize || 2, notes: dessert.description, ingredients: dessert.ingredients, imageUrl: dessert.imageUrl })}
                    />

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
