"use client";

type MealActionsProps = {
  inThisWeek: boolean;
  weekFull?: boolean;
  recipeLoading: boolean;
  busy?: boolean;
  onViewRecipe: () => void;
  onAddToWeek?: () => void;
  onSaveToVault: () => void;
};

export function SmartCartMealActions({
  inThisWeek,
  weekFull = false,
  recipeLoading,
  busy = false,
  onViewRecipe,
  onAddToWeek,
  onSaveToVault,
}: MealActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button className="col-span-2 min-h-11 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={recipeLoading || busy} onClick={onViewRecipe} type="button">
        {recipeLoading ? "Loading recipe..." : "View Recipe"}
      </button>
      <button className="min-h-11 rounded-full bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-70" disabled={inThisWeek || weekFull || busy} onClick={onAddToWeek} type="button">
        {inThisWeek ? "In This Week" : weekFull ? "This Week Full" : "Add to This Week"}
      </button>
      <button className="min-h-11 rounded-full bg-stone-100 px-3 py-3 text-sm font-semibold text-ink transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={onSaveToVault} type="button">
        Save to Vault
      </button>
    </div>
  );
}
