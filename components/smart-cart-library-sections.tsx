"use client";

import { FormEvent } from "react";

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

type WaitlistStatus = "idle" | "submitting" | "success" | "error";

type SmartCartLibrarySectionsProps = {
  archivedMeals: MealPlanItem[];
  cloudSyncMessage: string | null;
  expandedDetailCards: Set<string>;
  expandedIngredientsMeals: Set<string>;
  formatCardEyebrow: (day: string) => string;
  formatCurrency: (value: number) => string;
  getMealEstimatedPrice: (meal: MealPlanItem) => number;
  isSaving: boolean;
  isVaultOpen: boolean;
  onArchiveMeal: (meal: MealPlanItem) => void | Promise<void>;
  onGetRecipe: (meal: MealPlanItem) => void | Promise<void>;
  onPermanentDelete: (meal: MealPlanItem) => void | Promise<void>;
  onRestoreMeal: (meal: MealPlanItem) => void | Promise<void>;
  onSaveSession: () => void | Promise<void>;
  onToggleCardDetails: (cardKey: string) => void;
  onToggleIngredients: (meal: MealPlanItem) => void | Promise<void>;
  onToggleVaultOpen: () => void;
  onWaitlistEmailChange: (value: string) => void;
  onWaitlistSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  recipeCache: Record<string, { ingredients: string[] }>;
  recipeLoadingMeal: string | null;
  savedDesserts: MealPlanItem[];
  userSignedIn: boolean;
  waitlistEmail: string;
  waitlistStatus: WaitlistStatus;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function SmartCartLibrarySections({
  archivedMeals,
  cloudSyncMessage,
  expandedDetailCards,
  expandedIngredientsMeals,
  formatCardEyebrow,
  formatCurrency,
  getMealEstimatedPrice,
  isSaving,
  isVaultOpen,
  onArchiveMeal,
  onGetRecipe,
  onPermanentDelete,
  onRestoreMeal,
  onSaveSession,
  onToggleCardDetails,
  onToggleIngredients,
  onToggleVaultOpen,
  onWaitlistEmailChange,
  onWaitlistSubmit,
  recipeCache,
  recipeLoadingMeal,
  savedDesserts,
  userSignedIn,
  waitlistEmail,
  waitlistStatus,
}: SmartCartLibrarySectionsProps) {
  return (
    <section className="mt-6 flex flex-col gap-6">
      {savedDesserts.length > 0 ? (
        <div className="mt-6 rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-2xl text-ink">Saved Desserts</p>
              <p className="mt-1 text-sm leading-6 text-ink/70">
                Keep your favorite sweet treats in this week&apos;s plan.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-berry">
              {savedDesserts.length} saved
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {savedDesserts.map((meal, index) => {
              const mealKey = `${safeTrim(meal.day)}::${safeTrim(meal.name)}`;
              const mealEstimatedPrice = getMealEstimatedPrice(meal);

              return (
                <article
                  key={`saved-dessert-${meal.dbId ?? `${mealKey}-${index}`}`}
                  className="overflow-hidden rounded-3xl border border-stone-200 bg-[#fffdf9] shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3 p-5 pb-0">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
                        {formatCardEyebrow(safeTrim(meal.day))}
                      </p>
                      <h3 className="mt-2 font-display text-2xl text-ink">
                        {safeTrim(meal.name)}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-ink/80">
                        {formatCurrency(mealEstimatedPrice)}
                      </span>
                      <span className="text-sm font-semibold text-ink/65">
                        Serves {meal.servings}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    {expandedDetailCards.has(`saved-dessert-${mealKey}`) && (
                      <p className="text-sm leading-7 text-ink/75">{safeTrim(meal.notes)}</p>
                    )}
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-200"
                      onClick={() => onToggleCardDetails(`saved-dessert-${mealKey}`)}
                      type="button"
                    >
                      {expandedDetailCards.has(`saved-dessert-${mealKey}`)
                        ? "Hide Details"
                        : "Show Details"}
                    </button>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={recipeLoadingMeal === safeTrim(meal.name)}
                        onClick={() => onGetRecipe(meal)}
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
                        className="inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600"
                        onClick={() => void onPermanentDelete(meal)}
                        type="button"
                      >
                        Remove entirely
                      </button>
                    </div>
                    {expandedIngredientsMeals.has(mealKey) && (meal.ingredients ?? []).length > 0 && (
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
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {userSignedIn ? (
        <div className="mt-6 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Save your current week</p>
              <p className="text-sm leading-6 text-ink/65">
                Sync your dinners, sweet treats, pantry, and vault before you leave.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void onSaveSession()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
          {cloudSyncMessage ? (
            <p className="mt-3 text-sm font-medium text-ink/70">{cloudSyncMessage}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <strong>HOW TO USE THE VAULT:</strong> Click <strong>[Stash in Vault]</strong> on
        any active meal above to save its recipe here for future weeks. This removes it from
        your current grocery budget.
      </div>
      <button
        className="mt-6 inline-flex items-center justify-center rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-stone-200"
        onClick={onToggleVaultOpen}
        type="button"
      >
        {isVaultOpen ? "Close Recipe Vault" : `Open Recipe Vault (${archivedMeals.length})`}
      </button>
      {isVaultOpen ? (
        <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 shadow-sm">
          {archivedMeals.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {archivedMeals.map((meal) => (
                <article
                  key={`vault-${meal.dbId ?? `${meal.day}-${meal.name}`}`}
                  className="rounded-3xl border border-stone-200 bg-[#fffdf9] px-4 py-4 shadow-lg"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                    {formatCardEyebrow(meal.day)}
                  </p>
                  <h3 className="mt-2 font-display text-xl text-ink">{safeTrim(meal.name)}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">Serves {meal.servings}</p>
                  {expandedDetailCards.has(`vault-${meal.day}::${meal.name}`) && (
                    <p className="mt-3 text-sm leading-7 text-ink/75">{safeTrim(meal.notes)}</p>
                  )}
                  <button
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-orange-50"
                    onClick={() => onToggleCardDetails(`vault-${meal.day}::${meal.name}`)}
                    type="button"
                  >
                    {expandedDetailCards.has(`vault-${meal.day}::${meal.name}`)
                      ? "Hide Details"
                      : "Show Details"}
                  </button>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={recipeLoadingMeal === meal.name}
                      onClick={() => onGetRecipe(meal)}
                      type="button"
                    >
                      {recipeLoadingMeal === meal.name ? "Loading recipe..." : "Get Recipe"}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-stone-100 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={recipeLoadingMeal === meal.name}
                      onClick={() => onToggleIngredients(meal)}
                      type="button"
                    >
                      {expandedIngredientsMeals.has(`${meal.day}::${meal.name}`)
                        ? "Hide Ingredients"
                        : "View Ingredients"}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-pine px-3 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
                      onClick={() => void onRestoreMeal(meal)}
                      type="button"
                    >
                      Add to This Week
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600"
                      onClick={() => void onPermanentDelete(meal)}
                      type="button"
                    >
                      Permanent Delete
                    </button>
                  </div>
                  {expandedIngredientsMeals.has(`${meal.day}::${meal.name}`) &&
                    ((meal.ingredients && meal.ingredients.length > 0) ||
                      recipeCache[meal.name]) && (
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
                    )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/60">
              No archived recipes yet. Removed meals will land here for future weeks.
            </p>
          )}
        </div>
      ) : null}

      <section className="mt-6 rounded-[2.25rem] border border-stone-200 bg-white/80 p-6 shadow-xl backdrop-blur xl:p-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-3xl text-ink">The Ultimate Grocery Map is Coming</p>
          <p className="mt-3 text-sm leading-7 text-ink/70 sm:text-base">
            We are building an advanced routing engine to scan local store shelves and find
            the absolute cheapest places to buy your AI meal plan. Join the waitlist for early
            access!
          </p>

          {waitlistStatus === "success" ? (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
              Thanks for joining! You are now a part of something fantastic! Phase 2 coming
              soon!
            </div>
          ) : (
            <form
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
              onSubmit={onWaitlistSubmit}
            >
              <input
                className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200 sm:max-w-md"
                name="email"
                onChange={(event) => onWaitlistEmailChange(event.target.value)}
                placeholder="Enter your email address*"
                required
                type="email"
                value={waitlistEmail}
              />
              <button
                className="rounded-full bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={waitlistStatus === "submitting"}
                type="submit"
              >
                {waitlistStatus === "submitting" ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          )}
        </div>
      </section>
    </section>
  );
}
