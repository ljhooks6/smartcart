import test from "node:test";
import assert from "node:assert/strict";
import { restoreMealAtPosition, undoCookedEntry } from "../lib/meal-recovery.ts";
import { countCookedThisWeek } from "../lib/week-progress.ts";

test("restoring a meal preserves its position and meals added since removal", () => {
  const first = { day: "Day 1", name: "Dinner" };
  const removed = { day: "Day 2", name: "Soup" };
  const added = { day: "Day 3", name: "Tacos" };
  const restored = restoreMealAtPosition([first, added], removed, 1, 5);
  assert.deepEqual(restored, [first, removed, added]);
  assert.equal(restoreMealAtPosition(restored, removed, 1, 5), restored);
});

test("a full dinner lineup blocks recovery without losing the pending meal; treats are separate", () => {
  const full = Array.from({ length: 5 }, (_, index) => ({ day: `Day ${index}`, name: `Meal ${index}` }));
  assert.equal(restoreMealAtPosition(full, { day: "Day 6", name: "Pending dinner" }, 2, 5), null);
  assert.equal(full.length, 5);
  assert.deepEqual(restoreMealAtPosition([], { day: "Sweet Treat 1", name: "Cookies" }, 1), [{ day: "Sweet Treat 1", name: "Cookies" }]);
});

test("undo corrects this week's count without erasing an earlier cooking of the same meal", () => {
  const now = new Date(2026, 9, 12, 12);
  const earlier = { name: "Soup", cookedAt: new Date(2026, 9, 12, 9).toISOString() };
  const undone = { name: "Soup", cookedAt: new Date(2026, 9, 12, 10).toISOString() };
  const dessert = { name: "Cookies", cookedAt: new Date(2026, 9, 12, 11).toISOString() };
  const next = undoCookedEntry([earlier, undone, dessert], undone);
  assert.deepEqual(next, [earlier, dessert]);
  assert.equal(countCookedThisWeek(next, now), 2);
});
