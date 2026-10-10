"use client";

import { useId } from "react";
import { getMealKind, mealKindLabel } from "../lib/meal-types";
import { sortScheduledMeals } from "../lib/meal-schedule";

type WeekMeal = { day: string; name: string; scheduledDay?: string };
type Props = {
  dinners: WeekMeal[];
  desserts: WeekMeal[];
  cookedCount: number;
  groceryCount: number;
  collectedCount: number;
  pantryCount: number;
  estimatedCost: string;
  budget: string;
  overBudget: boolean;
  hasIngredients: boolean;
  hasOptions: boolean;
  vaultCount: number;
  onNavigate: (stage: "plan" | "meals" | "shop" | "cook" | "vault") => void;
};

export function SmartCartWeekDashboard({ dinners, desserts, cookedCount, groceryCount, collectedCount, pantryCount, estimatedCost, budget, overBudget, hasIngredients, hasOptions, vaultCount, onNavigate }: Props) {
  const titleId = useId();
  const readyCount = dinners.length + desserts.length;
  const chosenSummary = (["breakfast", "lunch", "dinner"] as const).map((kind) => {
    const count = dinners.filter((meal) => getMealKind(meal) === kind).length;
    return count ? `${count} ${kind}${count === 1 ? "" : "s"}` : "";
  }).filter(Boolean).concat(desserts.length ? [`${desserts.length} sweet treat${desserts.length === 1 ? "" : "s"}`] : []).join(", ");
  const remaining = groceryCount - collectedCount;
  const nextStage = readyCount ? (remaining > 0 ? "shop" : "cook") : hasOptions ? "meals" : "plan";
  const nextLabel = nextStage === "shop" ? "Open shopping list" : nextStage === "cook" ? "Choose a meal to cook" : nextStage === "meals" ? "Choose your meals" : "Plan your week";
  const nextTitle = nextStage === "shop" ? "Your shopping list is ready." : nextStage === "cook" ? "Ready when you are." : nextStage === "meals" ? "Your meal picks are ready." : "Let’s plan your week.";
  const nextDescription = nextStage === "shop" ? `${readyCount} meals chosen · ${remaining} items left to collect.` : nextStage === "cook" ? `${readyCount} meals ready for you to cook.` : nextStage === "meals" ? "Choose what you want to cook. We’ll build the list around your picks." : "Start with what’s in your kitchen, your budget, and a little inspiration.";
  const menu = sortScheduledMeals([...dinners.map(meal => ({ ...meal, kind: mealKindLabel(getMealKind(meal)) })), ...desserts.map(meal => ({ ...meal, kind: "Sweet Treat" }))]);

  return (
    <section aria-labelledby={titleId} className="md:rounded-[2rem] md:border md:border-pine/15 md:bg-[#fffdf8] md:p-8 md:shadow-xl">
      <h1 id={titleId} className="sr-only md:not-sr-only md:mb-6 md:font-display md:text-4xl md:text-ink">Your Week</h1>
      <div className="rounded-3xl bg-pine p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-apricot">Next up</p>
        <h2 className="mt-3 font-display text-3xl leading-tight">{nextTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-white/80">{nextDescription}</p>
        <button type="button" onClick={() => onNavigate(nextStage)} className="mt-5 min-h-12 w-full rounded-2xl bg-apricot px-5 py-3 text-sm font-semibold text-ink hover:bg-orange-200 sm:w-auto">{nextLabel}</button>
      </div>

      {!hasIngredients && readyCount > 0 ? <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">Some saved meals have no stored ingredients. Their shopping requirements are not included.</p> : null}

      {groceryCount > 0 || readyCount > 0 ? <div className="mt-5 border-b border-stone-200 pb-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-semibold text-ink">Shopping progress</p>
          <p className="text-ink/65">{collectedCount} of {groceryCount} collected</p>
        </div>
        {groceryCount > 0 ? <progress aria-label="Grocery collection progress" value={collectedCount} max={groceryCount} className="brand-progress mt-3 h-2 w-full" /> : null}
        <p className="mt-3 text-sm text-ink/65">Estimated groceries <strong className="text-ink">{estimatedCost}</strong> · {budget} budget</p>
        <p className={`mt-1 text-xs leading-5 ${overBudget ? "font-semibold text-red-700" : "text-ink/70"}`}>{overBudget ? "Above your budget. Review your meals or shopping list." : "Approximate prices; household extras are excluded."}</p>
      </div> : null}

      {readyCount > 0 ? <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink">This week’s meals</h2>
          <button type="button" onClick={() => onNavigate("cook")} className="min-h-11 shrink-0 text-sm font-semibold text-pine underline underline-offset-4">View all {readyCount}</button>
        </div>
        <ul className="mt-2 divide-y divide-stone-200">
          {menu.slice(0, 2).map((meal, index) => <li key={`${meal.kind}-${meal.day}-${meal.name}-${index}`} className="py-3">
            <p className="inline-flex rounded-full bg-sage/40 px-2 py-0.5 text-xs font-semibold text-pine">{meal.scheduledDay ? `${meal.scheduledDay} · ` : ""}{meal.kind}</p>
            <p className="mt-1 text-sm leading-6 text-ink">{meal.name}</p>
          </li>)}
        </ul>
      </div> : null}

      <button type="button" onClick={() => onNavigate("vault")} className="mt-4 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-100 px-4 py-3 text-left text-sm text-ink hover:bg-orange-200">
        <span className="font-semibold">Your saved favorites</span><span className="text-pine">{vaultCount} recipes <span aria-hidden="true">→</span></span>
      </button>

      {readyCount > 0 || groceryCount > 0 || cookedCount > 0 ? <details className="mt-4 text-sm text-ink/65">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">Week details</summary>
        <p className="mt-2 leading-6">{chosenSummary ? `${chosenSummary} chosen.` : "No meals chosen yet."}</p>
        <dl className="mt-3 space-y-2">
          <div className="flex justify-between gap-4"><dt>Pantry ingredients used</dt><dd className="font-semibold text-ink">{pantryCount}</dd></div>
          <div className="flex justify-between gap-4"><dt>Cooked this week</dt><dd className="font-semibold text-ink">{cookedCount}</dd></div>
        </dl>
        <p className="mt-3 text-xs leading-5">Cooking history and shopping progress stay on this device.</p>
        <button type="button" onClick={() => onNavigate(hasOptions ? "meals" : "plan")} className="mt-2 min-h-11 font-semibold text-pine underline underline-offset-4">{hasOptions ? "Review meal options" : "Adjust your plan"}</button>
      </details> : null}
    </section>
  );
}
