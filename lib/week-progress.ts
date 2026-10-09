export type CookedEntry = { name: string; cookedAt: string };

// Use the user's local calendar: a week begins on Monday at midnight.
export function countCookedThisWeek(entries: CookedEntry[], now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return entries.filter(entry => {
    const timestamp = new Date(entry.cookedAt).getTime();
    return timestamp >= start.getTime() && timestamp <= now.getTime();
  }).length;
}
