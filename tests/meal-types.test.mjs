import test from "node:test";
import assert from "node:assert/strict";
import { getMealKind, hasRoomForMeal, normalizeOptionalMeals } from "../lib/meal-types.ts";
import { buildGenerateListPrompts, buildReplaceMealPrompts } from "../lib/meal-prompt-builders.ts";
import { deriveGroceryLists } from "../lib/grocery-list.ts";

test("legacy dinners and new meal types retain their categories through JSON reload", () => {
  const meals = [{day:"Day 1"},{day:"Breakfast 1"},{day:"Lunch 2"},{day:"Sweet Treat 1"}];
  assert.deepEqual(JSON.parse(JSON.stringify(meals)).map(getMealKind), ["dinner","breakfast","lunch","sweet_treat"]);
  assert.equal(getMealKind({day:""}),"dinner");
});

test("five dinners leave room for breakfast and lunch; limits apply to each type", () => {
  const dinners = Array.from({length:5},(_,i)=>({day:`Day ${i+1}`}));
  assert.equal(hasRoomForMeal(dinners,{day:"Day 7"}),false);
  assert.equal(hasRoomForMeal(dinners,{day:"Breakfast 1"}),true);
  assert.equal(hasRoomForMeal(dinners,{day:"Lunch 1"}),true);
  const all=[...dinners,...Array.from({length:5},(_,i)=>({day:`Breakfast ${i+1}`}))];
  assert.equal(hasRoomForMeal(all,{day:"Breakfast 6"}),false);
  assert.equal(hasRoomForMeal(all,{day:"Lunch 1"}),true);
});

test("optional meals receive stable category labels and household servings", () => {
  const meal={day:"Day 1",name:"Eggs",servings:1,ingredients:[{name:"Eggs",amount:"4"}]};
  const normalized=normalizeOptionalMeals([meal],"breakfast",4);
  assert.equal(normalized[0].day,"Breakfast 1");
  assert.equal(normalized[0].servings,4);
  assert.deepEqual(normalized[0].ingredients,meal.ingredients);
  assert.equal(meal.day,"Day 1");
});

const base={adventureGuidance:"Keep it simple",adventureLevel:"Stick to basics",applyUpgrades:false,avoidancePromptBlock:"Avoid peanuts",budget:150,combinedPantryItems:"Rice",cuisinePromptBlock:"No preference",dietaryPromptBlock:"Vegetarian",existingMeals:"",fullyStocked:[],householdSize:4,includeDessert:false,mealSourceMode:"pantry-and-store",mustHavePromptBlock:"",prepTime:"Under 30 mins",restock:[],runningLow:[],selectedEquipment:"Stovetop"};
test("dinner remains the default; optional meal prompts apply across every plan",()=>{
  const defaultPrompt=buildGenerateListPrompts(base);
  assert.match(defaultPrompt.systemPrompt,/Breakfast is not selected/);
  assert.match(defaultPrompt.systemPrompt,/Lunch is not selected/);
  const selected=buildGenerateListPrompts({...base,includeBreakfast:true,includeLunch:true});
  assert.match(selected.systemPrompt,/exactly 3 practical breakfast/);
  assert.match(selected.systemPrompt,/exactly 3 practical lunch/);
  assert.match(selected.systemPrompt,/diet, avoidance, pantry-only, equipment, prep-time, and budget/);
  assert.match(selected.userPrompt,/Include Breakfast Options: Yes/);
});

test("replacement prompts preserve breakfast and lunch intent",()=>{
  for(const mealType of ["breakfast","lunch"]) {
    const prompt=buildReplaceMealPrompts({...base,mealType,blockedTitles:[],currentMealsContext:"Soup",rejectedMealTitle:"Eggs"});
    assert.match(prompt.systemPrompt,new RegExp(`replacement MUST be a ${mealType}`));
  }
});

test("chosen breakfasts and lunches share the dinner shopping list and retain recipe amounts",()=>{
  const meals=[{day:"Breakfast 1",name:"Egg toast",ingredients:[{name:"Eggs",amount:"2",price:2},{name:"Bread",amount:"2 slices",price:2}]},{day:"Lunch 1",name:"Egg sandwich",ingredients:[{name:"Eggs",amount:"2",price:2},{name:"Bread",amount:"2 slices",price:2}]}];
  const plan=deriveGroceryLists({weeklyMenu:meals,savedDesserts:[],fullyStocked:new Set(),runningLow:new Set(),restock:new Set(),pantryItems:[]});
  const rows=plan.derivedGroceryList;
  assert.equal(rows.find(item=>item.name==="Eggs").needed_amount,"4");
  assert.equal(rows.find(item=>item.name==="Bread").needed_amount,"4 slices");
});
