type MealIdentity = { day: string; name: string };
type CookedEntry = { name: string; cookedAt: string };

export function restoreMealAtPosition<T extends MealIdentity>(current: T[], meal: T, position: number, limit = Infinity): T[] | null {
  if (current.some((item) => item.day === meal.day && item.name === meal.name)) return current;
  if (current.length >= limit) return null;
  const next = [...current];
  next.splice(Math.max(0, Math.min(position, next.length)), 0, meal);
  return next;
}

export function undoCookedEntry(entries: CookedEntry[], entry: CookedEntry) {
  const index = entries.findLastIndex((item) => item.name === entry.name && item.cookedAt === entry.cookedAt);
  return index < 0 ? entries : entries.filter((_, itemIndex) => itemIndex !== index);
}
