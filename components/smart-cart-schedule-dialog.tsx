"use client";
import { useState } from "react";
import { SmartCartDialog } from "./smart-cart-dialog";
import { isDinnerSchedule, dinnerDayOccupancy, normalizeCookingDay, assignCookingDay, type ScheduledMeal, type CookingDay } from "../lib/meal-schedule";
export function SmartCartScheduleDialog({ meal, meals = [], editing = false, onClose, onAdd }: {
    meal: ScheduledMeal;
    meals?: ScheduledMeal[];
    editing?: boolean;
    onClose: () => void;
    onAdd: (day: CookingDay | undefined, mode?: "move" | "swap") => void;
}) {
    const [day, setDay] = useState(normalizeCookingDay(meal.scheduledDay));
    const [error, setError] = useState("");
    const days = dinnerDayOccupancy(isDinnerSchedule(meal) ? meals : [], meal);
    const occupied = day ? days.find(d => d.day === day)?.meals ?? [] : [];
    function submit(mode: "move" | "swap") { const result = assignCookingDay(meals, meal, day, mode); if (!result.ok) {
        setError(result.message);
        return;
    } onAdd(day, mode); }
    return <SmartCartDialog open title="Plan this meal" onClose={onClose}><h3 className="font-display text-2xl">{meal.name}</h3><p className="mt-3 text-sm">Choose a day. Occupied days show their dinner. Moving or swapping changes only your schedule, not recipes or AI allowance.</p>
 <fieldset className="mt-4 space-y-2"><legend className="font-semibold">Cooking day</legend><label className="flex min-h-12 items-center gap-3 rounded-xl border p-3"><input type="radio" name="cooking-day" checked={!day} onChange={() => { setDay(undefined); setError(""); }}/>Flexible — no day assigned</label>
 {days.map(d => <label key={d.day} className="flex min-h-12 items-start gap-3 rounded-xl border p-3"><input className="mt-1" type="radio" name="cooking-day" checked={day === d.day} onChange={() => { setDay(d.day); setError(""); }}/><span><strong>{d.day}</strong><span className="block text-sm">{d.meals.length ? `Occupied — ${d.meals.map(m => m.name).join(", ")}` : "Available"}</span></span></label>)}</fieldset>
 {occupied.length ? <p className="mt-3 text-sm">An explicit swap sends {occupied.map(m => m.name).join(", ")} to {meal.scheduledDay ?? "Flexible (no assigned day)"}. Nothing will be overwritten silently.</p> : null}
 {error ? <p className="mt-3 text-sm text-berry" role="alert">{error}</p> : null}
 <button type="button" onClick={() => submit(occupied.length ? "swap" : "move")} className="mt-4 min-h-12 w-full rounded-2xl bg-pine p-3 font-semibold text-white">{occupied.length ? "Confirm swap" : editing ? day ? "Move meal" : "Remove day assignment" : "Add to This Week"}</button></SmartCartDialog>;
}
