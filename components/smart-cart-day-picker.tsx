"use client";

import { useId } from "react";
import { cookingDays, normalizeCookingDay, type CookingDay } from "../lib/meal-schedule";

export function SmartCartDayPicker({ value, onChange }: { value?: string; onChange: (day: CookingDay | undefined) => void }) {
  const id = useId();
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2">
    <label htmlFor={id} className="text-sm font-semibold text-pine">Cook on</label>
    <select id={id} value={normalizeCookingDay(value) ?? ""} onChange={(event) => onChange(normalizeCookingDay(event.target.value))} className="min-h-11 min-w-0 rounded-lg border border-pine/20 bg-white px-3 text-base text-ink">
      <option value="">Decide later</option>
      {cookingDays.map(day => <option key={day} value={day}>{day}</option>)}
    </select>
  </div>;
}
