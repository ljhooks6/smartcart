"use client";
import Link from "next/link";
import { DietarySafetySummary } from "./dietary-safety-summary";
import { DietarySettings } from "./dietary-settings";

import { type FormEvent, useId, useRef } from "react";
import {SmartCartPantryEditor} from "./smart-cart-pantry-editor";
import type {PantryEntry} from "../lib/pantry";
import type {GroceryListItem} from "../lib/grocery-list";
import type { SmartCartPlan } from "@/lib/smart-cart-membership";

type SmartCartFormState = {
  budget: string;
  diet: string;
  cuisinePreference: string;
  householdSize: string;
  mealSourceMode: "pantry-and-store" | "pantry-only";
  pantryItems: string;
  mustHaveIngredient: string;
  avoidIngredients: string;
  includeDessert: boolean;
  includeBreakfast: boolean;
  includeLunch: boolean;
  prepTime: string;
  adventureLevel: string;
  availableEquipment: string[];
};

type SmartCartContextFormProps = {
  pantryEntries?:PantryEntry[];
  onPantryEntriesChange?:(entries:PantryEntry[])=>void;
  pantryRequirements?:GroceryListItem[];
  adventureLevelOptions: readonly string[];
  step?: number;
  onStepChange: (step: number) => void;
  canQuickReview?: boolean;
  equipmentOptions: readonly string[];
  featureError: string | null;
  formState: SmartCartFormState;
  isLoading: boolean;
  onBudgetChange: (value: string) => void;
  onClearForm: () => void;
  onCuisinePreferenceChange: (value: string) => void;
  onDietChange: (value: string) => void;
  onHouseholdSizeChange: (value: string) => void;
  onIncludeDessertChange: (checked: boolean) => void;
  onMealSourceModeChange: (value: SmartCartFormState["mealSourceMode"]) => void;
  onMustHaveIngredientChange: (value: string) => void;
  onAvoidIngredientsChange: (value: string) => void;
  onPrepTimeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onToggleEquipment: (equipment: string) => void;
  onToggleFeatureLevel: (value: string) => void;
  pantryQuickSelectOptions: Record<string, readonly string[]>;
  prepTimeOptions: readonly string[];
  userPlan: SmartCartPlan;
};

export function SmartCartContextForm({
  adventureLevelOptions,
  pantryEntries=[],onPantryEntriesChange=()=>{},pantryRequirements=[],
  step = 0,
  onStepChange,
  canQuickReview,
  equipmentOptions,
  featureError,
  formState,
  isLoading,
  onBudgetChange,
  onClearForm,
  onCuisinePreferenceChange,
  onDietChange,
  onHouseholdSizeChange,
  onIncludeDessertChange,
  onMealSourceModeChange,
  onMustHaveIngredientChange,
  onAvoidIngredientsChange,
  onPrepTimeChange,
  onSubmit,
  onToggleEquipment,
  onToggleFeatureLevel,
  pantryQuickSelectOptions,
  prepTimeOptions,
  userPlan,
}: SmartCartContextFormProps) {
  const isPlusMember = userPlan === "plus";

  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = ["Budget", "Household", "Preferences", "Pantry and equipment", "Dinner and sweet treats", "Review"];
  const validBudget = Number(formState.budget) >= 0.01 && Number(formState.budget) <= 10000;
  const size = Number(formState.householdSize);
  const validSize = Number.isInteger(size) && size >= 1 && size <= 30;
  const button = "min-h-11 rounded-full border border-pine/25 px-4 py-2 text-sm font-semibold text-pine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  function go(next: number) {
    onStepChange(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    if (step < 5) {
      go(step + 1);
    } else if (!validBudget || !validSize) {
      go(validBudget ? 1 : 0);
    } else {
      void onSubmit(event);
    }
  }

  return <section className="min-w-0 rounded-3xl border border-pine/15 bg-[#fcfaf6] p-4 md:p-6" aria-label="Guided weekly planning">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-pine">Step {step + 1} of {steps.length}</p>
      <progress aria-label="Planning progress" value={step + 1} max={steps.length} className="w-24 accent-pine" />
    </div>
    <h2 ref={heading} tabIndex={-1} className="mt-3 font-display text-2xl text-ink">{steps[step]}</h2>
    {step > 0 ? <nav className="my-2 flex flex-wrap gap-x-3" aria-label="Earlier planning steps">
      {steps.slice(0, step).map((label, index) => <button key={label} type="button" disabled={isLoading} className="min-h-11 text-sm font-semibold text-pine underline" onClick={() => go(index)}>{label}</button>)}
    </nav> : null}
    <form className="mt-4 space-y-4" id={id} onSubmit={advance}>
      {step === 0 ? <>
        <p className="text-sm">Set a target for your selected dinners and any sweet treats. Store prices may be unavailable.</p>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Weekly Budget</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/50">
                $
              </span>
              <input
                className="w-full max-w-xs rounded-full border border-ink/10 bg-white px-8 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
                inputMode="decimal"
                min="0.01" max="10000" step="0.01"
                onChange={(event) => onBudgetChange(event.target.value)}
                placeholder="75"
                required
                type="number"
                value={formState.budget}
              />
            </div>
          </label>

      </> : null}
      {step === 1 ? <>
        <p className="text-sm">How many people are you cooking for? This sets the default servings per dinner.</p>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Household Size</span>
            <input
              className="block w-full max-w-xs rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
              min="1" max="30" required
              onChange={(event) => onHouseholdSizeChange(event.target.value)}
              placeholder="2"
              type="number"
              value={formState.householdSize}
            />
          </label>
      </> : null}
      {step === 2 ? <>
        <p role="note" aria-label="Planning allergy safety" className="text-sm leading-6 text-ink">Allergy-dependent or free-from AI generation is temporarily restricted. Keep actual restrictions entered; do not remove them to obtain a plan. Saved recipes and grocery lists are not verified for allergies. Check ingredients, labels and cross-contact independently. <Link className="inline-block min-h-11 py-3 font-semibold text-pine underline" href="/legal/safety">Read the complete dietary safety notice</Link></p>
        <DietarySettings value={formState.diet} onChange={onDietChange} />
        <div className="hidden md:block"><DietarySafetySummary compact diet={formState.diet} value={null} /></div>

        <label className="space-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            Cuisine Vibe
            {!isPlusMember ? (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-orange-700">
                Plus
              </span>
            ) : null}
          </span>
          <select
            className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-ink/45 focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
            disabled={!isPlusMember}
            onChange={(event) => onCuisinePreferenceChange(event.target.value)}
            value={formState.cuisinePreference}
          >
            <option value="">No preference</option>
            <option value="American">American</option>
            <option value="Mexican">Mexican</option>
            <option value="Italian">Italian</option>
            <option value="Asian">Asian</option>
            <option value="Mediterranean">Mediterranean</option>
            <option value="Comfort Food">Comfort food</option>
          </select>
          <p className="text-sm leading-6 text-ink/60">
            {isPlusMember
              ? "Let the week lean toward a flavor lane without boxing every meal into the same pattern."
              : "MealCaddie Plus unlocks cuisine personalization and stronger meal-quality refinement."}
          </p>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Prep Time Available</span>
            <select
              className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
              onChange={(event) => onPrepTimeChange(event.target.value)}
              value={formState.prepTime}
            >
              {prepTimeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Adventure Level</span>
            <select
              className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
              onChange={(event) => onToggleFeatureLevel(event.target.value)}
              value={formState.adventureLevel}
            >
              {adventureLevelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

      </> : null}
      {step === 3 ? <>
        <div className="rounded-[1.75rem] border border-orange-200 bg-gradient-to-br from-white via-orange-50/70 to-cream px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700/80">
            Meal source
          </p>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Choose whether MealCaddie can plan around a store trip or should only use what is
            already in your kitchen.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              {
                value: "pantry-and-store" as const,
                title: "Pantry + store pickup",
                copy: "Use what you have, then fill the gaps with a smart grocery list.",
              },
              {
                value: "pantry-only" as const,
                title: "Pantry only",
                copy: "Suggest meals from pantry ingredients. Check quantities before cooking.",
              },
            ].map((option) => {
              const isSelected = formState.mealSourceMode === option.value;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`min-h-11 rounded-2xl border px-3 py-3 text-sm text-left transition ${
                    isSelected
                      ? "border-orange-400 bg-white text-ink shadow-md ring-2 ring-orange-200"
                      : "border-stone-200 bg-white/60 text-ink/65 hover:border-orange-200 hover:bg-white"
                  }`}
                  key={option.value}
                  onClick={() => onMealSourceModeChange(option.value)}
                  type="button"
                >
                  <span className="block font-semibold">{option.title}</span>
                  <span className="hidden md:block mt-2 text-sm leading-6">{option.copy}</span>
                </button>
              );
            })}
          </div>
        </div>


        <fieldset className="space-y-2">
          <legend className="font-semibold text-pine">Available kitchen equipment</legend>
          <div className="flex flex-wrap gap-2">{equipmentOptions.map(equipment => <label key={equipment} className="flex min-h-11 items-center gap-2 rounded-xl border border-pine/20 px-3 text-sm">
            <input type="checkbox" className="accent-pine" checked={formState.availableEquipment.includes(equipment)} onChange={() => onToggleEquipment(equipment)} />
            {equipment}
          </label>)}</div>
        </fieldset>
        <p className="text-sm">Adding pantry ingredients is optional when you’re open to shopping. Exact amounts are optional.</p>
        <section className="min-w-0 rounded-3xl border border-pine/20 bg-white p-4"><SmartCartPantryEditor entries={pantryEntries} options={pantryQuickSelectOptions} onChange={onPantryEntriesChange} requirements={pantryRequirements}/></section>

      </> : null}
      {step === 4 ? <>
        <p className="text-sm">You’ll choose dinners after generation. Breakfast and lunch are planned for a future update. Existing saved meals remain available.</p>
        <fieldset className="space-y-2">
          <legend className="font-semibold text-pine">Would you like something sweet this week?</legend>
          <p className="text-sm">Up to two dessert suggestions may be included when the budget permits. Only treats you select go on your shopping list.</p>
          {([true, false] as const).map(include => <label key={String(include)} className="flex min-h-11 items-center gap-3 rounded-xl border border-pine/20 px-3">
            <input type="radio" name={`${id}-dessert`} checked={formState.includeDessert === include} onChange={() => onIncludeDessertChange(include)} />
            {include ? "Include sweet treats" : "Not this week"}
          </label>)}
        </fieldset>
      </> : null}
      {step === 5 ? <>
        <dl className="space-y-2 rounded-xl bg-white p-4 text-sm [&_dt]:font-semibold [&_dd]:break-words">
          <dt>Weekly budget</dt><dd>{validBudget ? "$" + formState.budget : "Needs a budget"}</dd>
          <dt>Servings per dinner</dt><dd>{validSize ? size : "Needs a household size"}</dd>
          <dt>Preferences</dt><dd>{formState.prepTime} · {formState.adventureLevel}{isPlusMember && formState.cuisinePreference ? ` · ${formState.cuisinePreference}` : ""}</dd>
          <dt>Dietary needs</dt><dd>{formState.diet || "None entered"}</dd>
          <dt>Meal source and equipment</dt><dd>{formState.mealSourceMode === "pantry-only" ? "Pantry only" : "Pantry and store"} · {pantryEntries.length} pantry ingredients · {formState.availableEquipment.join(", ") || "No equipment selected"}</dd>
          <dt>Sweet treats</dt><dd>{formState.includeDessert ? "Include when budget permits" : "Not this week"}</dd>
        </dl>
        <p className="text-sm">Choose meals after generation. MealCaddie will combine their ingredients and ask about uncertain pantry amounts before you shop.</p>
        {formState.mealSourceMode === "pantry-only" ? <p className="text-sm font-semibold">Pantry-only suggestions still need a quantity check before cooking.</p> : null}
        <p className="text-sm">Allergy-dependent generation is restricted. <Link href="/legal/safety" className="underline">Read the dietary safety notice</Link>.</p>
        <fieldset className="min-w-0 space-y-4 rounded-2xl border border-pine/20 bg-white p-4" aria-describedby={`${id}-final-help ${id}-allergies`}>
          <legend className="px-1 font-display text-xl text-pine">Any final requests for your week?</legend>
          <p id={`${id}-final-help`} className="text-sm">These are completely optional. If you don&apos;t have anything specific in mind, leave them blank and let MealCaddie come up with ideas for you.</p>
          <div className="space-y-1">
            <label htmlFor={`${id}-include`} className="text-sm font-semibold">Anything you&apos;d like to include? (Optional)</label>
            <input id={`${id}-include`} type="text" aria-describedby={`${id}-include-help`} className="block min-h-11 w-full min-w-0 rounded-xl border border-pine/30 px-3 py-2 text-base focus-visible:outline-pine"
              placeholder="e.g., Chicken, pasta, or broccoli" value={formState.mustHaveIngredient} onChange={event => onMustHaveIngredientChange(event.target.value)} />
            <p id={`${id}-include-help`} className="text-sm">Craving something or have an ingredient you&apos;d like to use? Let us know!</p>
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-avoid`} className="text-sm font-semibold">Anything you&apos;d rather avoid? (Optional)</label>
            <input id={`${id}-avoid`} type="text" aria-describedby={`${id}-avoid-help`} className="block min-h-11 w-full min-w-0 rounded-xl border border-pine/30 px-3 py-2 text-base focus-visible:outline-pine"
              placeholder="e.g., Mushrooms, seafood, or spicy foods" value={formState.avoidIngredients} onChange={event => onAvoidIngredientsChange(event.target.value)} />
            <p id={`${id}-avoid-help`} className="text-sm">Tell us what you&apos;d prefer to leave out this week.</p>
          </div>
          <p id={`${id}-allergies`} className="text-sm">Enter any food allergies in <button type="button" onClick={() => go(2)} disabled={isLoading} className="min-h-11 font-semibold text-pine underline">Dietary settings</button> under Preferences.</p>
        </fieldset>
      </> : null}

      {featureError ? <p role="alert" className="rounded-xl bg-berry/10 p-3 text-sm text-berry">{featureError}</p> : null}
      <div className="flex flex-wrap gap-2">
        {step > 0 ? <button className={button} type="button" disabled={isLoading} onClick={() => go(step - 1)}>Back</button> : null}
        <button className={`${button} bg-pine text-white disabled:opacity-60`} disabled={isLoading} type="submit">
          {isLoading ? "Building your meals…" : step < 5 ? "Continue" : "Generate"}
        </button>
        {step === 0 && canQuickReview && validBudget && validSize ? <button className={button} type="button" disabled={isLoading} onClick={() => go(5)}>Review saved answers</button> : null}
      </div>
      {step === 5 ? <button type="button" className="min-h-11 text-sm text-berry underline" onClick={onClearForm} disabled={isLoading}>Clear workspace</button> : null}
    </form>
  </section>;
}
