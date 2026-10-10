export const cookingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type CookingDay = typeof cookingDays[number];

export function normalizeCookingDay(value: unknown): CookingDay | undefined {
  return cookingDays.includes(value as CookingDay) ? value as CookingDay : undefined;
}

export function setCookingDay<T extends { day: string; name: string }>(meal: T, value: unknown): T & { scheduledDay?: CookingDay } {
  return { ...meal, scheduledDay: normalizeCookingDay(value) };
}

export function sortScheduledMeals<T extends { scheduledDay?: string }>(meals: T[]): T[] {
  const rank = (meal: T) => { const day = normalizeCookingDay(meal.scheduledDay); return day ? cookingDays.indexOf(day) : 7; };
  return [...meals].sort((a, b) => rank(a) - rank(b));
}
