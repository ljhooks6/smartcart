"use client";

import { FormEvent } from "react";

type SmartCartFormState = {
  budget: string;
  diet: string;
  householdSize: string;
  pantryItems: string;
  mustHaveIngredient: string;
  avoidIngredients: string;
  includeDessert: boolean;
  prepTime: string;
  adventureLevel: string;
  availableEquipment: string[];
};

type SmartCartContextFormProps = {
  adventureLevelOptions: readonly string[];
  combinedPantryItems: string[];
  equipmentOptions: readonly string[];
  featureError: string | null;
  formState: SmartCartFormState;
  fullyStocked: Set<string>;
  isEquipmentSheetOpen: boolean;
  isBudgetValid: boolean;
  isLoading: boolean;
  isPantryOpen: boolean;
  isPantrySelectionOpen: boolean;
  onBudgetChange: (value: string) => void;
  onClearForm: () => void;
  onDietChange: (value: string) => void;
  onHouseholdSizeChange: (value: string) => void;
  onIncludeDessertChange: (checked: boolean) => void;
  onMustHaveIngredientChange: (value: string) => void;
  onAvoidIngredientsChange: (value: string) => void;
  onPantryItemsChange: (value: string) => void;
  onPrepTimeChange: (value: string) => void;
  onRemovePantryItem: (item: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onToggleEquipment: (equipment: string) => void;
  onToggleFeatureLevel: (value: string) => void;
  onToggleEquipmentSheetOpen: () => void;
  onTogglePantryOpen: () => void;
  onTogglePantrySelectionOpen: () => void;
  onToggleQuickItem: (item: string) => void;
  pantryCategoryStyles: Record<string, string>;
  pantryQuickSelectOptions: Record<string, readonly string[]>;
  prepTimeOptions: readonly string[];
};

export function SmartCartContextForm({
  adventureLevelOptions,
  combinedPantryItems,
  equipmentOptions,
  featureError,
  formState,
  fullyStocked,
  isEquipmentSheetOpen,
  isBudgetValid,
  isLoading,
  isPantryOpen,
  isPantrySelectionOpen,
  onBudgetChange,
  onClearForm,
  onDietChange,
  onHouseholdSizeChange,
  onIncludeDessertChange,
  onMustHaveIngredientChange,
  onAvoidIngredientsChange,
  onPantryItemsChange,
  onPrepTimeChange,
  onRemovePantryItem,
  onSubmit,
  onToggleEquipment,
  onToggleFeatureLevel,
  onToggleEquipmentSheetOpen,
  onTogglePantryOpen,
  onTogglePantrySelectionOpen,
  onToggleQuickItem,
  pantryCategoryStyles,
  pantryQuickSelectOptions,
  prepTimeOptions,
}: SmartCartContextFormProps) {
  return (
    <div className="rounded-[2.25rem] border border-stone-200 bg-[#fcfaf6]/95 p-6 shadow-xl backdrop-blur xl:p-8">
      <div className="mb-6 rounded-[1.75rem] border border-stone-200/80 bg-white/75 px-5 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-berry/70">
          Planner
        </p>
        <p className="mt-2 font-display text-3xl text-ink">Set up your week</p>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Give the planner enough context to keep meals affordable and realistic.
        </p>
      </div>

      <form className="space-y-5" id="smart-cart-context-form" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Weekly Budget</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/50">
                $
              </span>
              <input
                className="w-full rounded-full border border-ink/10 bg-white px-8 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
                inputMode="decimal"
                min="1"
                onChange={(event) => onBudgetChange(event.target.value)}
                placeholder="75"
                required
                type="number"
                value={formState.budget}
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink">Household Size</span>
            <input
              className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
              min="1"
              onChange={(event) => onHouseholdSizeChange(event.target.value)}
              placeholder="2"
              type="number"
              value={formState.householdSize}
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Dietary Restrictions</span>
          <input
            className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
            onChange={(event) => onDietChange(event.target.value)}
            placeholder="Vegetarian, nut-free, halal, low-sodium..."
            type="text"
            value={formState.diet}
          />
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

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink">Available Kitchen Equipment</p>
            <p className="mt-1 text-sm leading-6 text-ink/65">
              Recipes will only use the hardware you select here.
            </p>
          </div>
          <button
            className="flex w-full items-center justify-between rounded-[1.5rem] border border-stone-200 bg-white px-5 py-4 text-left shadow-sm transition hover:bg-stone-50 md:hidden"
            onClick={onToggleEquipmentSheetOpen}
            type="button"
          >
            <div>
              <p className="text-sm font-semibold text-ink">Choose your equipment</p>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                {formState.availableEquipment.length > 0
                  ? `${formState.availableEquipment.length} selected`
                  : "Tap to select your kitchen setup"}
              </p>
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-ink/55">
                {isEquipmentSheetOpen ? "Close" : "Open"}
            </span>
          </button>
          <div className="hidden flex-wrap gap-2 md:flex">
            {equipmentOptions.map((equipment) => {
              const isSelected = formState.availableEquipment.includes(equipment);

              return (
                <label
                  key={equipment}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isSelected
                      ? "border-pine bg-pine text-white"
                      : "border-ink/10 bg-white text-ink hover:border-orange-300 hover:bg-orange-50"
                  }`}
                >
                  <input
                    checked={isSelected}
                    className="sr-only"
                    onChange={() => onToggleEquipment(equipment)}
                    type="checkbox"
                  />
                  <span>{equipment}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
          <button
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            onClick={onTogglePantrySelectionOpen}
            type="button"
          >
            <div>
              <p className="text-sm font-semibold text-ink">Pantry Quick-Select</p>
              <p className="mt-1 text-sm leading-6 text-ink/65">
                Tap common staples to add them before typing anything custom.
              </p>
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-ink/55">
              {isPantrySelectionOpen ? "Hide" : "Select Pantry Items"}
            </span>
          </button>
          {isPantrySelectionOpen ? (
            <div className="hidden border-t border-stone-200 px-6 pb-5 pt-4 md:block">
              <div className="mb-4 space-y-2 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                <p>
                  <strong>
                    <span
                      aria-hidden="true"
                      className="mr-1 inline-block h-4 w-4 rounded border border-green-800 bg-green-700 align-middle shadow-sm"
                    />
                    Clicked (Owned):
                  </strong>{" "}
                  You have a good amount. (App will <strong>SKIP</strong> buying this).
                </p>
                <p>
                  <strong>
                    <span
                      aria-hidden="true"
                      className="mr-1 inline-block h-4 w-4 rounded border border-gray-300 bg-white align-middle shadow-sm"
                    />
                    Unclicked (Need to Buy):
                  </strong>{" "}
                  Leave unclicked if you have none OR very little. (App will <strong>ADD</strong>{" "}
                  it to your list).
                </p>
              </div>
              <div className="space-y-3">
                {Object.entries(pantryQuickSelectOptions).map(([category, items]) => (
                  <div
                    key={category}
                    className={`rounded-3xl border p-4 ${
                      pantryCategoryStyles[category] ?? "border-stone-200 bg-white"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                      {category}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {items.map((item) => {
                        const isFullyStocked = fullyStocked.has(item);
                        const stateClass = isFullyStocked
                          ? "border-green-800 bg-green-700 text-white"
                          : "border-gray-300 bg-white text-ink hover:border-orange-300 hover:bg-orange-50";

                        return (
                          <button
                            key={item}
                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${stateClass}`}
                            onClick={() => onToggleQuickItem(item)}
                            type="button"
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {isEquipmentSheetOpen ? (
          <div className="fixed inset-0 z-40 bg-ink/35 p-4 md:hidden">
            <div className="mx-auto mt-4 flex max-h-[82vh] w-full flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 pb-4 pt-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine/55">
                    Equipment
                  </p>
                  <p className="mt-1 font-display text-2xl text-ink">Kitchen setup</p>
                </div>
                <button
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-ink"
                  onClick={onToggleEquipmentSheetOpen}
                  type="button"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
                <p className="text-sm leading-6 text-ink/65">
                  Select the tools you actually want meals to use this week.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 pr-1">
                {equipmentOptions.map((equipment) => {
                  const isSelected = formState.availableEquipment.includes(equipment);

                  return (
                    <label
                      key={`mobile-${equipment}`}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition ${
                        isSelected
                          ? "border-pine bg-pine text-white"
                          : "border-ink/10 bg-white text-ink hover:border-orange-300 hover:bg-orange-50"
                      }`}
                    >
                      <input
                        checked={isSelected}
                        className="sr-only"
                        onChange={() => onToggleEquipment(equipment)}
                        type="checkbox"
                      />
                      <span>{equipment}</span>
                    </label>
                  );
                })}
                </div>
              </div>
              <div className="border-t border-stone-200 px-5 py-4">
                <button
                  className="w-full rounded-full bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-pine/90"
                  onClick={onToggleEquipmentSheetOpen}
                  type="button"
                >
                  Finish Equipment Setup
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">
            Must-Have Ingredient (Optional)
          </span>
          <input
            className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
            onChange={(event) => onMustHaveIngredientChange(event.target.value)}
            placeholder="e.g., Chicken breast, heavy cream"
            type="text"
            value={formState.mustHaveIngredient}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">
            Do Not Include (Optional)
          </span>
          <input
            className="w-full rounded-full border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
            onChange={(event) => onAvoidIngredientsChange(event.target.value)}
            placeholder="e.g., honey mustard, stir fry, mushrooms"
            type="text"
            value={formState.avoidIngredients}
          />
        </label>

        <div className="rounded-[1.75rem] border border-pine/10 bg-pine text-cream">
          <button
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            onClick={onTogglePantryOpen}
            type="button"
          >
            <span className="font-display text-xl">Pantry Snapshot</span>
            <span className="text-xs uppercase tracking-[0.2em] text-cream/70">
              {isPantryOpen ? "Hide" : "View Pantry Snapshot"}
            </span>
          </button>
          {isPantryOpen ? (
            <div className="border-t border-white/10 px-6 pb-5 pt-4">
              <div className="flex flex-wrap gap-2">
                {combinedPantryItems.length > 0 ? (
                  combinedPantryItems.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm"
                    >
                      <span>{item}</span>
                      <button
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs text-cream transition hover:bg-white/20"
                        onClick={() => onRemovePantryItem(item)}
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-cream/80">
                    Add a few pantry ingredients and they&apos;ll show up here.
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Pantry Check</span>
          <textarea
            className="min-h-32 w-full rounded-3xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-200"
            onChange={(event) => onPantryItemsChange(event.target.value)}
            placeholder="Type any additional ingredients you have that are not listed above (e.g., leftover chicken, half an onion)..."
            value={formState.pantryItems}
          />
        </label>

        <label className="flex items-center gap-3 rounded-[1.5rem] border border-pine/10 bg-cream px-4 py-4">
          <input
            checked={formState.includeDessert}
            className="h-4 w-4 rounded border-pine/30 text-pine focus:ring-pine"
            onChange={(event) => onIncludeDessertChange(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm font-semibold text-ink">
            Include 2 Weekly Dessert Options (If budget allows)
          </span>
        </label>

        {featureError ? (
          <div className="rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm text-berry">
            {featureError}
          </div>
        ) : null}

        <div className="hidden items-center justify-between gap-4 md:flex">
          <button
            className="flex-1 rounded-full bg-orange-500 px-6 py-4 font-display text-lg text-white transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !isBudgetValid}
            type="submit"
          >
            {isLoading ? "Cooking up your plan..." : "Generate"}
          </button>
          <button
            className="shrink-0 text-sm text-gray-500 underline decoration-gray-300 underline-offset-4 transition hover:text-red-500"
            onClick={onClearForm}
            type="button"
          >
            Clear Form
          </button>
        </div>
      </form>

      {isPantrySelectionOpen ? (
        <div className="fixed inset-0 z-40 bg-ink/35 p-4 md:hidden">
          <div className="mx-auto mt-4 flex max-h-[82vh] w-full flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 pb-4 pt-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/55">
                  Pantry
                </p>
                <p className="mt-1 font-display text-2xl text-ink">Quick-select staples</p>
              </div>
              <button
                className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-ink"
                onClick={onTogglePantrySelectionOpen}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
              <div className="space-y-2 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                <p>
                  <strong>Clicked:</strong> you have enough and we skip buying it.
                </p>
                <p>
                  <strong>Unclicked:</strong> we add it to your shopping list.
                </p>
              </div>
              <div className="mt-4 space-y-3 pr-1">
              {Object.entries(pantryQuickSelectOptions).map(([category, items]) => (
                <div
                  key={`mobile-${category}`}
                  className={`rounded-3xl border p-4 ${
                    pantryCategoryStyles[category] ?? "border-stone-200 bg-white"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-berry/70">
                    {category}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {items.map((item) => {
                      const isFullyStocked = fullyStocked.has(item);
                      const stateClass = isFullyStocked
                        ? "border-green-800 bg-green-700 text-white"
                        : "border-gray-300 bg-white text-ink hover:border-orange-300 hover:bg-orange-50";

                      return (
                        <button
                          key={`mobile-${item}`}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${stateClass}`}
                          onClick={() => onToggleQuickItem(item)}
                          type="button"
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              </div>
            </div>
            <div className="border-t border-stone-200 px-5 py-4">
              <button
                className="w-full rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                onClick={onTogglePantrySelectionOpen}
                type="button"
              >
                Finish Pantry Selection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
