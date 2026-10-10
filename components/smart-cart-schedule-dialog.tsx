"use client";

import { useState } from "react";
import { SmartCartDialog } from "./smart-cart-dialog";
import { SmartCartDayPicker } from "./smart-cart-day-picker";
import { normalizeCookingDay, type CookingDay } from "../lib/meal-schedule";

export function SmartCartScheduleDialog({ meal, onClose, onAdd }: { meal: { name: string; scheduledDay?: string }; onClose: () => void; onAdd: (day: CookingDay | undefined) => void }) {
  const [day, setDay] = useState(normalizeCookingDay(meal.scheduledDay));
  return <SmartCartDialog open title="Plan this meal" onClose={onClose}>
    <h3 className="font-display text-2xl text-ink">{meal.name}</h3>
    <p className="mt-3 text-sm leading-6 text-ink/70">When would you like to make it? You can change the day in Cook anytime. Adding this meal also adds its ingredients to your shopping list.</p>
    <div className="mt-5"><SmartCartDayPicker value={day} onChange={setDay} /></div>
    <button type="button" onClick={() => onAdd(day)} className="mt-5 min-h-12 w-full rounded-2xl bg-pine px-4 py-3 text-sm font-semibold text-white">Add to This Week</button>
  </SmartCartDialog>;
}
