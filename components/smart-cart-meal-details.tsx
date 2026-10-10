"use client";

import { useId } from "react";

export function SmartCartMealDetails({ expanded, onToggle, notes }: { expanded: boolean; onToggle: () => void; notes: string }) {
  const panelId = useId();
  return <div className="mt-3">
    <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={onToggle} className="min-h-11 rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-ink hover:bg-orange-50">{expanded ? "Hide Details" : "Show Details"}</button>
    <div id={panelId} hidden={!expanded} className="mt-3 rounded-2xl border border-pine/10 bg-cream p-4 text-sm leading-7 text-ink/75">
      <p className="mb-1 font-semibold text-pine">Meal details</p>
      <p>{notes.trim() || "No extra notes were saved for this meal. Open this meal in Cook or Vault for ingredients and cooking steps."}</p>
    </div>
  </div>;
}
