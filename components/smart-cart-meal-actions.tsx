"use client";

import type { ReactNode } from "react";

type MealActionsProps = {
  inThisWeek: boolean;
  weekFull?: boolean;
  recipeLoading: boolean;
  busy?: boolean;
  onViewRecipe: () => void;
  onAddToWeek?: () => void;
  onSaveToVault?: () => void;
  more?: ReactNode;
};

export function SmartCartMealActions({
  inThisWeek,
  weekFull = false,
  recipeLoading,
  busy = false,
  onViewRecipe,
  onAddToWeek,
  onSaveToVault,
  more,
}: MealActionsProps) {
  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${onAddToWeek && !inThisWeek ? "grid-cols-2" : "grid-cols-1"}`}>
      <button className="min-h-12 rounded-2xl bg-orange-500 px-3 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={recipeLoading || busy} onClick={onViewRecipe} type="button">
        {recipeLoading ? "Loading recipe..." : "View Recipe"}
      </button>
      {onAddToWeek && !inThisWeek ? <button className="min-h-12 rounded-2xl bg-pine px-3 py-3 text-sm font-semibold text-white hover:bg-pine/90 disabled:opacity-60" disabled={weekFull || busy} onClick={onAddToWeek} type="button">{weekFull ? "This Week Full" : "Add to This Week"}</button> : null}
      </div>
      {onAddToWeek && inThisWeek ? <p className="text-sm font-semibold text-pine">In This Week</p> : null}
      {onSaveToVault || more ? <details className="border-t border-pine/10">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-pine">More</summary>
        <div className="space-y-3 pb-2">
          {onSaveToVault ? <button className="min-h-11 w-full rounded-xl bg-sage/30 px-3 py-3 text-left text-sm font-semibold text-pine hover:bg-sage/50 disabled:opacity-60" disabled={busy} onClick={onSaveToVault} type="button">Save to Vault</button> : null}
          {more}
        </div>
      </details> : null}
    </div>
  );
}
