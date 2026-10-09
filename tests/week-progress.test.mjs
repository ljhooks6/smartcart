import test from "node:test";
import assert from "node:assert/strict";
import { countCookedThisWeek } from "../lib/week-progress.ts";

test("Monday starts a new local week and excludes future and invalid events", () => {
  const now = new Date(2026, 9, 12, 12);
  const entries = [
    { name: "Sunday dinner", cookedAt: new Date(2026, 9, 11, 23, 59).toISOString() },
    { name: "Monday dinner", cookedAt: new Date(2026, 9, 12, 0).toISOString() },
    { name: "Dessert", cookedAt: new Date(2026, 9, 12, 11).toISOString() },
    { name: "Future event", cookedAt: new Date(2026, 9, 13, 12).toISOString() },
    { name: "Invalid legacy event", cookedAt: "invalid" },
  ];
  assert.equal(countCookedThisWeek(entries, now), 2);
});

test("Sunday still counts the preceding Monday and all completed sweet treats", () => {
  const now = new Date(2026, 9, 11, 23, 59);
  assert.equal(countCookedThisWeek([
    { name: "Old dinner", cookedAt: new Date(2026, 9, 4, 23, 59).toISOString() },
    { name: "Monday dinner", cookedAt: new Date(2026, 9, 5, 0).toISOString() },
    { name: "Sunday dessert", cookedAt: new Date(2026, 9, 11, 23).toISOString() },
  ], now), 2);
  assert.equal(countCookedThisWeek([], now), 0);
});
