"use client";

import { SmartCartMealDetails } from "./smart-cart-meal-details";
import { SmartCartFirstUseGuide, type FirstUseGuidanceProps } from "./smart-cart-first-use-guide";
import { SmartCartMealActions } from "./smart-cart-meal-actions";
import { SmartCartDayPicker } from "./smart-cart-day-picker";
import { getMealKind, mealKindLabel } from "../lib/meal-types";
import { sortScheduledMeals, type CookingDay } from "../lib/meal-schedule";

type MealPlanItem = {
  dbId?: number | string; user_id: string; day: string; name: string; servings: number; notes: string;
  scheduledDay?: CookingDay;
  ingredients?: { name: string; amount: string; price?: number }[];
};
type Props = FirstUseGuidanceProps & {
  expandedDetailCards: Set<string>;
  onArchiveMeal: (meal: MealPlanItem) => void | Promise<void>;
  onGetRecipe: (meal: MealPlanItem) => void | Promise<void>;
  onRemoveFromWeeklyMenu: (meal: MealPlanItem) => void | Promise<void>;
  onToggleCardDetails: (key: string) => void;
  onScheduleMeal: (meal: MealPlanItem, day: CookingDay | undefined) => void;
  recipeLoadingMeal: string | null; savedDesserts: MealPlanItem[]; weeklyMenu: MealPlanItem[];
};

export function SmartCartCookSections({ showGuidance, onDismissGuidance, expandedDetailCards, onArchiveMeal, onGetRecipe, onRemoveFromWeeklyMenu, onToggleCardDetails, onScheduleMeal, recipeLoadingMeal, savedDesserts, weeklyMenu }: Props) {
  const total = weeklyMenu.length + savedDesserts.length;
  const renderMeal = (meal: MealPlanItem) => {
    const key = `saved-${meal.day}::${meal.name}`;
    return <article key={key} className="rounded-3xl border border-pine/15 border-t-4 border-t-apricot bg-white p-4 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-berry">{mealKindLabel(getMealKind(meal))} · {meal.scheduledDay ?? "Flexible"}</p>
      <h3 className="mt-2 font-display text-xl text-ink">{meal.name}</h3>
      <p className="mt-2 text-sm text-ink/70">Serves {meal.servings}</p>
      <div className="mt-4"><SmartCartDayPicker value={meal.scheduledDay} onChange={(day) => onScheduleMeal(meal, day)} /></div>
      <div className="mt-4"><SmartCartMealActions inThisWeek recipeLoading={recipeLoadingMeal === meal.name} onViewRecipe={() => void onGetRecipe(meal)} onSaveToVault={() => void onArchiveMeal(meal)} more={<>
        <SmartCartMealDetails expanded={expandedDetailCards.has(key)} onToggle={() => onToggleCardDetails(key)} notes={meal.notes} />
        <button type="button" onClick={() => void onRemoveFromWeeklyMenu(meal)} className="min-h-11 w-full rounded-xl border border-pine/20 px-3 py-3 text-left text-sm font-semibold text-pine">Cooked It</button>
      </>} /></div>
    </article>;
  };
  return <div className="space-y-6">
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-ink">Your cook-ready lineup</h2>
        <span className="shrink-0 rounded-full bg-sage/30 px-3 py-1 text-sm font-semibold text-pine">{total} ready</span>
      </div>
      <SmartCartFirstUseGuide area="cook" showGuidance={showGuidance} onDismissGuidance={onDismissGuidance} />
      {!total ? <div className="mt-5 rounded-2xl border border-dashed border-pine/20 bg-white p-6 text-center"><p className="font-display text-xl">Nothing in This Week yet</p><p className="mt-3 text-sm text-ink/70">Add meals from Meals or Vault, then choose when to cook them.</p></div> : null}
      {weeklyMenu.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{sortScheduledMeals(weeklyMenu).map(renderMeal)}</div> : null}
    </section>
    {savedDesserts.length ? <section><h2 className="font-display text-2xl text-berry">This Week’s Sweet Treats</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{sortScheduledMeals(savedDesserts).map(renderMeal)}</div></section> : null}
  </div>;
}
