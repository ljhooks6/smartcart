"use client";

import { mergeDietaryEntries } from "../lib/dietary-safety";
import { DietarySafetySummary } from "./dietary-safety-summary";
import { useEffect, useRef, useState } from "react";
import { SmartCartDialog } from "./smart-cart-dialog";
import Link from "next/link";
import { getRecipeSourceKey } from "../lib/recipe-ingredients";
import { normalizeProgress, normalizeSavedRecipes, recipeStorageKey, rememberRecipe, toggleProgressIndex, type Recipe, type RecipeProgress } from "../lib/recipe-progress";
import { loadStoredJson, saveStoredJson } from "../lib/smart-cart-persistence";

type Meal = { name: string; dietaryRestrictions?: string; notes?: string; servings?: number; ingredients?: { name: string; amount: string }[] };
type Props = {
  diet: string;
  activeRecipe: Recipe | undefined; activeRecipeMeal: Meal | null; onClose: () => void;
  recipeError: string | null; recipeLoadingMeal: string | null; userId: string; onCooked?: () => void;
  sourceNotice?: string;
};

function InteractiveRecipe({ recipe, meal, userId, onCooked }: { recipe: Recipe; meal: Meal; userId: string; onCooked?: () => void }) {
  const source = getRecipeSourceKey(meal);
  const storageKey = recipeStorageKey(userId);
  const [progress, setProgress] = useState<RecipeProgress>(() => normalizeProgress(normalizeSavedRecipes(loadStoredJson(storageKey)).find(item => item.source === source)?.progress, recipe));
  const [section, setSection] = useState<"ingredients" | "steps">("ingredients");
  const [step, setStep] = useState(() => Math.max(0, recipe.steps.findIndex((_, index) => !progress.steps.includes(index))));
  const [storageFailed, setStorageFailed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const stepsTabRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { contentRef.current?.parentElement?.scrollTo({ top: 0, behavior: "instant" }); }, [section]);
  const complete = progress.steps.length === recipe.steps.length;
  const update = (next: RecipeProgress) => {
    setProgress(next);
    setStorageFailed(!saveStoredJson(storageKey, rememberRecipe(normalizeSavedRecipes(loadStoredJson(storageKey)), { source, recipe, progress: next })));
  };
  const markStep = () => {
    update({ ...progress, steps: progress.steps.includes(step) ? progress.steps : [...progress.steps, step] });
    setStep(Math.min(step + 1, recipe.steps.length - 1));
  };
  return <div ref={contentRef}>
    <h3 className="font-display text-2xl text-ink">{meal.name}</h3>
    <p className="mt-3 text-sm font-semibold text-pine">{recipe.prep_time_minutes} minutes{meal.servings ? ` · Serves ${meal.servings}` : ""}</p>
    <div aria-label="Recipe sections" className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-cream p-1">
      {(["ingredients", "steps"] as const).map(value => <button ref={value === "steps" ? stepsTabRef : undefined} key={value} type="button" aria-pressed={section === value} onClick={() => setSection(value)} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${section === value ? "bg-pine text-white" : "text-pine"}`}>{value === "ingredients" ? "Ingredients" : "Cooking steps"}</button>)}
    </div>
    {section === "ingredients" ? <section className="mt-5">
      <div className="flex items-center justify-between gap-3"><h4 className="font-display text-xl">Get everything ready</h4><span className="shrink-0 text-sm text-pine">{progress.ingredients.length}/{recipe.ingredients.length} ready</span></div>
      <ul className="mt-3 divide-y divide-pine/10">{recipe.ingredients.map((ingredient, index) => <li key={`${index}-${ingredient}`}><label className="flex min-h-12 cursor-pointer items-start gap-3 py-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-pine" checked={progress.ingredients.includes(index)} onChange={() => update({ ...progress, ingredients: toggleProgressIndex(progress.ingredients, index) })} /><span className={progress.ingredients.includes(index) ? "text-ink/65 line-through" : "text-ink"}>{ingredient}</span></label></li>)}</ul>
      <button type="button" onClick={() => { setSection("steps"); stepsTabRef.current?.focus({ preventScroll: true }); }} className="mt-5 min-h-12 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white">{progress.steps.length ? "Continue cooking" : "Start cooking"}</button>
    </section> : <section className="mt-5">
      <div className="flex items-center justify-between gap-3"><h4 className="font-display text-xl">Cook along</h4><span className="text-sm text-pine">{progress.steps.length}/{recipe.steps.length} done</span></div>
      <progress aria-label="Recipe step progress" value={progress.steps.length} max={recipe.steps.length} className="brand-progress mt-3 h-2 w-full" />
      {complete ? <p role="status" className="mt-4 rounded-2xl bg-sage/30 p-4 text-sm font-semibold text-pine">All steps checked off. Ready to serve!</p> : null}
      <div className="mt-4 rounded-2xl border border-pine/15 bg-cream p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-berry">Step {step + 1} of {recipe.steps.length}{progress.steps.includes(step) ? " · Done" : ""}</p>
        <p className="mt-3 text-base leading-7">{recipe.steps[step]}</p>
        <div className="mt-5 flex gap-2"><button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className="min-h-11 rounded-xl border border-pine/20 bg-white px-4 text-sm font-semibold text-pine disabled:opacity-50">Previous</button><button type="button" onClick={markStep} className="min-h-11 flex-1 rounded-xl bg-pine px-3 py-3 text-sm font-semibold text-white">{progress.steps.includes(step) ? step === recipe.steps.length - 1 ? "Step completed" : "Next step" : step === recipe.steps.length - 1 ? "Mark step done" : "Done & next"}</button></div>
      </div>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-pine">All cooking steps</summary><ol className="divide-y divide-pine/10">{recipe.steps.map((text, index) => <li key={index}><label className="flex cursor-pointer gap-3 py-4 text-sm leading-6"><input aria-label={`Step ${index + 1} completed`} type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-pine" checked={progress.steps.includes(index)} onChange={() => update({ ...progress, steps: toggleProgressIndex(progress.steps, index) })} /><span><strong>{index + 1}.</strong> {text}</span></label></li>)}</ol></details>
      {onCooked ? <button type="button" onClick={onCooked} className="mt-4 min-h-12 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white">Cooked It</button> : null}
    </section>}
    <div className="mt-5 border-t border-pine/10 pt-3"><p className="text-xs leading-5 text-ink/70">Recipe checkoffs stay on this device and don’t change your shopping list.</p>{storageFailed ? <p role="status" className="mt-2 text-sm text-berry">This device couldn’t save your progress. It will last while this recipe stays open.</p> : null}<button type="button" onClick={() => { update({ ingredients: [], steps: [] }); setStep(0); }} className="mt-2 min-h-11 text-sm font-semibold text-pine underline underline-offset-4">Reset recipe progress</button></div>
  </div>;
}

export function SmartCartRecipeModal({ diet, activeRecipe, activeRecipeMeal, onClose, recipeError, recipeLoadingMeal, userId, onCooked, sourceNotice }: Props) {
  if (!activeRecipeMeal) return null;
  return <SmartCartDialog open title="Recipe" onClose={onClose}>
    {sourceNotice?<aside aria-label="Engineering candidate limitations" className="mb-5 rounded-xl border border-pine/30 bg-cream p-4 text-sm"><p>{sourceNotice}</p><Link href="/legal/safety" className="inline-block min-h-11 py-3 underline">Complete dietary safety notice</Link></aside>:<DietarySafetySummary diet={mergeDietaryEntries(diet,activeRecipeMeal.dietaryRestrictions)} value={activeRecipe || activeRecipeMeal} />}
    {activeRecipe ? <InteractiveRecipe key={`${userId}:${getRecipeSourceKey(activeRecipeMeal)}`} recipe={activeRecipe} meal={activeRecipeMeal} userId={userId} onCooked={onCooked} /> : <><h3 className="font-display text-2xl">{activeRecipeMeal.name}</h3><p role="status" className="mt-5 rounded-2xl bg-cream p-4 text-sm leading-6 text-ink/70">{recipeError || (recipeLoadingMeal === activeRecipeMeal.name ? "Building a fast, step-by-step recipe…" : "Getting your recipe ready…")}</p></>}
  </SmartCartDialog>;
}
