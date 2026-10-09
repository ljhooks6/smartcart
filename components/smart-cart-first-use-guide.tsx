"use client";

import { useId, useState } from "react";
import type { GuidanceArea } from "../hooks/use-first-use-guidance";

export type FirstUseGuidanceProps = {
  showGuidance: boolean;
  onDismissGuidance: (remember: boolean) => void;
};

const guidance = {
  cook: {
    title: "Your meals for This Week",
    body: "Add dinners and Sweet Treats to This Week to put them here and build your shopping list. Open View Recipe when you are ready to cook. Cooked It marks a meal finished and updates the shopping list.",
  },
  vault: {
    title: "Keep recipes for another week",
    body: "Save to Vault moves a dinner or Sweet Treat out of your active week and keeps it here for later. Add to This Week adds it to Cook and your shopping list while keeping your Vault favorite for future weeks.",
  },
  shop: {
    title: "Shop for the meals you chose",
    body: "Your list follows This Week. Check your kitchen against Skipped ingredients and add back anything you need. Enter Store Mode for large checkboxes, department navigation, and Undo. Shopping progress stays on this device.",
  },
} satisfies Record<GuidanceArea, { title: string; body: string }>;

export function SmartCartFirstUseGuide({ area, showGuidance, onDismissGuidance }: FirstUseGuidanceProps & { area: GuidanceArea }) {
  const titleId = useId();
  const [remember, setRemember] = useState(false);
  if (!showGuidance) return null;

  return (
    <aside aria-labelledby={titleId} className="my-4 rounded-2xl border border-pine/20 bg-white/90 p-4 text-ink shadow-sm">
      <h3 id={titleId} className="font-semibold text-pine">{guidance[area].title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/75">{guidance[area].body}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-5 w-5 accent-pine" />
          Don&apos;t show this again
        </label>
        <button type="button" onClick={() => onDismissGuidance(remember)} className="min-h-11 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-pine/90">Got it</button>
      </div>
    </aside>
  );
}
