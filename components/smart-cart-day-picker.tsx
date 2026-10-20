"use client";

import { useId } from "react";
import { cookingDays, normalizeCookingDay, type CookingDay } from "../lib/meal-schedule";
import {isDinnerSchedule,dinnerDayOccupancy,type ScheduledMeal} from "../lib/meal-schedule";

export function SmartCartDayPicker({ value, onChange,meals=[],meal }: { value?: string; onChange: (day: CookingDay | undefined) => void;meals?:ScheduledMeal[];meal?:ScheduledMeal }) {
  const id = useId();
  return <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-cream px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
    <label htmlFor={id} className="shrink-0 text-sm font-semibold text-pine">Cook on</label>
    <select id={id} value={normalizeCookingDay(value) ?? ""} onChange={(event) => onChange(normalizeCookingDay(event.target.value))} className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-pine/20 bg-white px-3 text-base text-ink sm:w-auto sm:flex-1">
      <option value="">Decide later</option>
      {cookingDays.map(day => {const occupied=(!meal||isDinnerSchedule(meal))?(dinnerDayOccupancy(meals,meal).find(d=>d.day===day)?.meals??[]):[];return <option key={day} value={day} disabled={occupied.length>0}>{day}{occupied.length?` — ${occupied.map(m=>m.name).join(", ")}`:" — Available"}</option>;})}
    </select>
  </div>;
}
