"use client";

import { useId } from "react";

type WeekMeal = { day: string; name: string };
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
  const remaining = groceryCount - collectedCount;
  const nextStage = readyCount ? (remaining > 0 ? "shop" : "cook") : hasOptions ? "meals" : "plan";
  const nextLabel = nextStage === "shop" ? "Open shopping list" : nextStage === "cook" ? "Choose a meal to cook" : nextStage === "meals" ? "Choose your meals" : "Plan your week";
  return (
    <section aria-labelledby={titleId} className="rounded-[2rem] border border-pine/15 bg-[#fffdf8] p-5 shadow-xl sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine/70">A calmer way to feed your week</p>
          <h1 id={titleId} className="mt-2 font-display text-4xl text-ink">Your Week</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/70">{readyCount ? `${dinners.length} dinner${dinners.length === 1 ? "" : "s"} and ${desserts.length} sweet treat${desserts.length === 1 ? "" : "s"} chosen. Your next step is ready below.` : hasOptions ? "Your meal options are ready. Choose what you want to cook to build your shopping list." : "Start with your pantry and preferences. Your meals, shopping, and cooking progress will come together here."}</p>
        </div>
        <button type="button" onClick={() => onNavigate(nextStage)} className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white hover:bg-pine/90">{nextLabel}</button>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Ready to cook", String(readyCount), "Chosen dinners + sweet treats"],
          ["Groceries collected", `${collectedCount} / ${groceryCount}`, groceryCount ? `${remaining} items still to collect` : readyCount ? "No items on your list" : "Choose meals to build your list"],
          ["Pantry ingredients used", String(pantryCount), "Already owned and skipped"],
          ["Cooked this week", String(cookedCount), "Marked Cooked It on this device"],
        ].map(([label, value, detail]) => <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4"><dt className="text-xs font-semibold text-ink/65">{label}</dt><dd className="mt-2 font-display text-3xl text-pine">{value}</dd><p className="mt-2 text-xs leading-5 text-ink/60">{detail}</p></div>)}
      </dl>
      {groceryCount > 0 ? <progress aria-label="Grocery collection progress" value={collectedCount} max={groceryCount} className="mt-5 h-3 w-full accent-pine" /> : null}
      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-semibold text-ink">Estimated groceries: {estimatedCost} <span className="font-normal text-ink/60">of {budget} budget</span></p>
        <p className={`mt-2 text-xs leading-5 ${overBudget ? "text-red-700" : "text-ink/60"}`}>{overBudget ? "Above your budget. Review your meals or shopping list." : "Approximate grocery prices; extras and household items are not priced."}</p>
        {!hasIngredients && readyCount > 0 ? <p className="mt-2 text-xs text-amber-800">Some saved meals have no stored ingredients. Their shopping requirements are not included.</p> : null}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl bg-[#f3f5eb] p-5">
          <h2 className="font-display text-2xl text-ink">On the menu</h2>
          {readyCount ? <ul className="mt-4 space-y-3">{[...dinners.map(meal => ({ ...meal, kind: "Dinner" })), ...desserts.map(meal => ({ ...meal, kind: "Sweet treat" }))].map((meal, index) => <li key={`${meal.kind}-${meal.day}-${meal.name}-${index}`}><p className="text-xs font-semibold uppercase tracking-wider text-pine/65">{meal.kind}</p><p className="mt-1 text-sm text-ink">{meal.name}</p></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-ink/65">No meals chosen yet. Save dinner and dessert picks to your Cook Lineup.</p>}
          <button type="button" onClick={() => onNavigate(hasOptions ? "meals" : "plan")} className="mt-5 text-sm font-semibold text-pine underline underline-offset-4">{hasOptions ? "Review meal options" : "Adjust your plan"}</button>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="font-display text-2xl text-ink">Carry the week forward</h2>
          <div className="mt-4 flex flex-col gap-3">
            <button type="button" onClick={() => onNavigate("shop")} className="rounded-xl border border-stone-200 px-4 py-3 text-left text-sm font-semibold text-pine">Shop · {remaining} items remaining</button>
            <button type="button" onClick={() => onNavigate("cook")} className="rounded-xl border border-stone-200 px-4 py-3 text-left text-sm font-semibold text-pine">Cook · {readyCount} meals ready</button>
            <button type="button" onClick={() => onNavigate("vault")} className="rounded-xl border border-stone-200 px-4 py-3 text-left text-sm font-semibold text-pine">Recipe Vault · {vaultCount} favorites</button>
          </div>
        </div>
      </div>
    </section>
  );
}
