import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCookingDay, setCookingDay, sortScheduledMeals } from "../lib/meal-schedule.ts";
import { getMealKind } from "../lib/meal-types.ts";
import { getRecipeSourceKey } from "../lib/recipe-ingredients.ts";
import { weekSnapshot, recoverWeekDraft } from "../lib/save-recovery.ts";

test("choosing a cooking day preserves source identity, category, and recipe quantities", () => {
  const meal = { day: "Breakfast 3", name: "Eggs", servings: 2, notes: "Scramble", ingredients: [{ name: "Eggs", amount: "4" }] };
  const scheduled = setCookingDay(meal, "Friday");
  assert.equal(scheduled.day, "Breakfast 3");
  assert.equal(getMealKind(scheduled), "breakfast");
  assert.equal(getRecipeSourceKey(scheduled), getRecipeSourceKey(meal));
  assert.deepEqual(scheduled.ingredients, meal.ingredients);
  assert.equal(meal.scheduledDay, undefined);
  assert.equal(setCookingDay(scheduled, "").scheduledDay, undefined);
});

test("older option numbers and invalid days are never treated as calendar choices", () => {
  for (const value of [undefined, null, "Day 1", "Breakfast 1", "Tomorrow", {}, 1]) assert.equal(normalizeCookingDay(value), undefined);
  assert.equal(normalizeCookingDay("Monday"), "Monday");
});

test("schedule order is stable, keeps multiple meals on a day, and puts undecided meals last", () => {
  const meals = [{name:"Later"},{name:"Sun",scheduledDay:"Sunday"},{name:"Breakfast",scheduledDay:"Monday"},{name:"Dinner",scheduledDay:"Monday"}];
  assert.deepEqual(sortScheduledMeals(meals).map(meal=>meal.name), ["Breakfast","Dinner","Sun","Later"]);
  assert.equal(meals[0].name,"Later");
});

test("rescheduling makes a week dirty and its recovery draft retains the selected day", () => {
  const meal = { day:"Day 3", name:"Soup" };
  const scheduled = setCookingDay(meal,"Wednesday");
  assert.notEqual(weekSnapshot([meal],[],null),weekSnapshot([scheduled],[],null));
  const draft=JSON.parse(JSON.stringify({userId:"owner",dinners:[scheduled],desserts:[],pantry:[],dirty:true}));
  assert.equal(recoverWeekDraft(draft,"owner").dinners[0].scheduledDay,"Wednesday");
  assert.equal(recoverWeekDraft(draft,"other"),null);
});
