import assert from "node:assert/strict";
import test from "node:test";
import { aggregateIngredientItems, deriveGroceryLists, getIngredientKey, mergeAmounts } from "../lib/grocery-list.ts";
import { formatRecipeIngredients, getRecipeSourceKey } from "../lib/recipe-ingredients.ts";

const ingredient = (name, amount = "1 cup", mealName = "Dinner") => ({ name, amount, mealName, mealNotes: "" });
const meal = (name, entries) => ({ name, ingredients: entries.map(([name, amount]) => ({ name, amount })) });
const derive = (options = {}) => deriveGroceryLists({
  fullyStocked: new Set(), runningLow: new Set(), restock: new Set(), weeklyMenu: [], savedDesserts: [], ...options,
});
const find = (list, name) => list.find(item => item.item_key === getIngredientKey(name));

test("different varieties, forms, and dietary qualifiers remain separate", () => {
  for (const [first, second] of [
    ["Macaroni", "Spaghetti"], ["Jasmine rice", "Basmati rice"],
    ["Yellow onion", "Red onion"], ["Milk", "Coconut milk"],
    ["Milk", "Almond milk"], ["Whole milk", "2% milk"],
    ["Garlic", "Garlic powder"], ["Chicken breast", "Chicken broth"],
    ["Cheddar cheese", "Mozzarella cheese"], ["Canned black beans", "Dry black beans"],
    ["Crushed tomatoes", "Diced tomatoes"], ["All-purpose flour", "Gluten-free flour"],
    ["Spaghetti", "Whole wheat spaghetti"], ["Fresh basil", "Dried basil"],
  ]) {
    const list = aggregateIngredientItems([ingredient(first), ingredient(second)]);
    assert.equal(list.length, 2, `${first} must not merge with ${second}`);
    assert.deepEqual(new Set(list.map(item => item.name)), new Set([first, second]));
  }
});

test("true duplicates combine without losing the recipe shopping name or meal links", () => {
  const list = aggregateIngredientItems([
    ingredient("Yellow onion, diced", "1", "Chili"),
    ingredient("yellow onions", "2", "Soup"),
    ingredient("Elbow macaroni", "8 oz", "Mac and cheese"),
    ingredient("Macaroni", "0.5 lb", "Pasta salad"),
  ]);
  assert.equal(list.length, 2);
  assert.equal(find(list, "Yellow onion").needed_amount, "3");
  assert.equal(find(list, "Yellow onion").name, "Yellow onion");
  assert.deepEqual(find(list, "Yellow onion").preparation_notes, ["diced"]);
  assert.deepEqual(find(list, "Yellow onion").meal_names, ["Chili", "Soup"]);
  assert.equal(find(list, "Macaroni").needed_amount, "1 lb");
});

test("quantities add fractions, mixed numbers, unit aliases, counts, and compatible units", () => {
  for (const [first, second, expected] of [
    ["1/2 cup", "½ cup", "1 cup"], ["1½ cups", "1/4 cup", "1.75 cups"],
    ["1 1/2 cups", "2 cups", "3.5 cups"], ["2", "3", "5"],
    ["1 can", "2 cans", "3 cans"], ["1 box", "2 boxes", "3 boxes"],
    ["2 tsp", "1 teaspoon", "3 tsp"], ["1 cup", "8 tbsp", "1.5 cups"],
    ["1 lb", "8 oz", "1.5 lb"], ["1 kg", "500 g", "1.5 kg"],
    ["1 cup + 2 cloves", "1 cup", "2 cups + 2 cloves"],
  ]) assert.equal(mergeAmounts(first, second), expected, `${first} + ${second}`);
});

test("ambiguous quantities are retained, including identical repeated packages", () => {
  assert.equal(mergeAmounts("1 (15 oz) can", "1 (15 oz) can"), "1 (15 oz) can + 1 (15 oz) can");
  assert.equal(mergeAmounts("1 cup", "1 lb"), "1 cup + 1 lb");
  assert.equal(mergeAmounts("1/0 cup", "1 cup"), "1 cup + 1/0 cup");
  assert.equal(mergeAmounts("1 cup", ""), "1 cup");
});

test("owning one food does not hide related but different shopping ingredients", () => {
  const result = derive({
    pantryEntries: [{name:"Whole milk",quantity:1,unit:"cup",status:"owned"},{name:"Garlic",quantity:2,unit:"clove",status:"owned"},{name:"Red onions",quantity:1,unit:"each",status:"owned"}],
    weeklyMenu: [meal("Dinner", [
      ["Whole milk", "1 cup"], ["Garlic cloves, minced", "2 cloves"], ["Red onion, diced", "1"],
      ["Coconut milk", "1 can"], ["Garlic powder", "1 tsp"], ["Chicken broth", "2 cups"], ["Macaroni", "8 oz"],
    ])],
  });
  assert.equal(result.skippedGroceryList.length, 3);
  assert.deepEqual(new Set(result.derivedGroceryList.map(item => item.name)), new Set(["Coconut milk", "Garlic powder", "Chicken broth", "Macaroni"]));
});

test("restoring and removing an owned variety affects only that grocery item", () => {
  const args = {
    pantryEntries: ["Jasmine rice","Basmati rice"].map(name=>({name,quantity:1,unit:"cup",status:"owned"})),
    weeklyMenu: [meal("Rice bowls", [["Jasmine rice", "1 cup"], ["Basmati rice", "1 cup"]])],
    restoredItems: [getIngredientKey("Jasmine rice")],
  };
  const restored = derive(args);
  assert.deepEqual(restored.derivedGroceryList.map(item => item.name), ["Jasmine rice"]);
  assert.deepEqual(restored.skippedGroceryList.map(item => item.name), ["Basmati rice"]);
  assert.equal(derive({ ...args, removedGroceryItems: [getIngredientKey("Jasmine rice")] }).derivedGroceryList.length, 0);
  assert.equal(derive({ ...args, restoredItems: [] }).skippedGroceryList.length, 2);
});

test("typed name-only pantry ingredients need explicit quantity or sufficiency confirmation", () => {
  const result = derive({ pantryItems: ["rice", "canned black beans", "olive oil"], weeklyMenu: [
    meal("Rice and beans", [["Rice", "1 cup"], ["Canned Black Beans", "1 can"], ["Olive Oil", "1 tbsp"], ["Yellow Onion", "1"]]),
  ] });
  assert.equal(result.derivedGroceryList.length, 4);
  assert.equal(result.skippedGroceryList.length, 0);
  assert.match(find(result.derivedGroceryList,"Rice").pantry_note,/Amount unknown/);
});

test("restock overrides owned status and avoids a duplicate recipe/restock row", () => {
  const args = {
    fullyStocked: new Set(["Yellow onions"]),
    restock: new Set(["Yellow onion", "Yellow onions", "Olive oil"]),
    weeklyMenu: [meal("Soup", [["Yellow onion, diced", "2"]])],
  };
  const result = derive(args);
  assert.equal(result.derivedGroceryList.length, 2);
  assert.equal(result.skippedGroceryList.length, 0);
  assert.equal(find(result.derivedGroceryList, "Yellow onion").needed_amount, "2");
  assert.equal(derive({ ...args, removedGroceryItems: [getIngredientKey("Yellow onion")] }).derivedGroceryList.length, 1);
});

test("processed ingredients go to their shopping department", () => {
  for (const [name, category] of [
    ["Frozen spinach", "Frozen"], ["Garlic powder", "Spices & Seasonings"],
    ["Canned tomatoes", "Pantry & Dry Goods"], ["Chicken broth", "Pantry & Dry Goods"],
    ["Coconut milk", "Pantry & Dry Goods"], ["Eggs", "Dairy & Eggs"],
    ["Flour tortillas", "Bakery & Bread"], ["Red bell peppers", "Produce"],
    ["Corn tortillas", "Bakery & Bread"], ["Scallions", "Produce"], ["Snap peas", "Produce"],
  ]) assert.equal(aggregateIngredientItems([ingredient(name)])[0].category, category, name);
});

test("a complete five-dinner week plus two treats retains every required ingredient", () => {
  const weeklyMenu = [
    meal("Mac and cheese", [["Elbow macaroni", "8 oz"], ["Cheddar cheese", "1 cup"], ["Whole milk", "1 cup"], ["Butter", "2 tbsp"]]),
    meal("Spaghetti", [["Spaghetti", "8 oz"], ["Crushed tomatoes", "1 can"], ["Yellow onion", "1"], ["Garlic", "2 cloves"]]),
    meal("Coconut curry", [["Jasmine rice", "1 cup"], ["Coconut milk", "1 can"], ["Frozen spinach", "8 oz"], ["Chicken breast", "1 lb"], ["Garlic powder", "1 tsp"]]),
    meal("Burrito bowls", [["Basmati rice", "1 cup"], ["Canned black beans", "1 can"], ["Red onion", "1"], ["Cheddar cheese", "½ cup"]]),
    meal("Chicken soup", [["Chicken broth", "4 cups"], ["Chicken breast", "8 oz"], ["Yellow onions, diced", "1"], ["Garlic", "3 cloves"]]),
  ];
  const savedDesserts = [
    meal("Cookies", [["All-purpose flour", "1½ cups"], ["Butter", "4 tbsp"], ["Whole milk", "½ cup"]]),
    meal("Rice pudding", [["Jasmine rice", "½ cup"], ["Whole milk", "2 cups"], ["Sugar", "½ cup"]]),
  ];
  const result = derive({ weeklyMenu, savedDesserts, pantryEntries: [{name:"Garlic",quantity:5,unit:"clove",status:"owned"},{name:"Butter",quantity:6,unit:"tbsp",status:"owned"},{name:"Sugar",quantity:0.5,unit:"cup",status:"owned"}] });
  assert.equal(result.derivedGroceryList.length, 16);
  assert.equal(result.skippedGroceryList.length, 3);
  assert.equal(find(result.derivedGroceryList, "Whole milk").needed_amount, "3.5 cups");
  assert.equal(find(result.derivedGroceryList, "Whole milk").buy_amount, undefined, "do not assume one carton covers every week");
  assert.equal(find(result.derivedGroceryList, "Jasmine rice").needed_amount, "1.5 cups");
  assert.equal(find(result.derivedGroceryList, "Chicken breast").needed_amount, "1.5 lb");
  assert.equal(find(result.derivedGroceryList, "Cheddar cheese").needed_amount, "1.5 cups");
  assert.equal(find(result.skippedGroceryList, "Butter").needed_amount, "6 tbsp");
  assert.deepEqual(find(result.derivedGroceryList, "Whole milk").meal_names, ["Cookies", "Mac and cheese", "Rice pudding"]);
  const plannedKeys = new Set([...weeklyMenu, ...savedDesserts].flatMap(meal => meal.ingredients.map(item => getIngredientKey(item.name))));
  assert.deepEqual(new Set([...result.derivedGroceryList, ...result.skippedGroceryList].map(item => item.item_key)), plannedKeys);
});

test("recipe ingredient lines preserve names and amounts and cache identity follows changes", () => {
  const source = { name: "Mac and cheese", notes: "Creamy", servings: 2, ingredients: [{ name: "Elbow macaroni", amount: "8 oz" }, { name: "Whole milk", amount: "½ cup" }] };
  assert.deepEqual(formatRecipeIngredients(source.ingredients), ["8 oz Elbow macaroni", "½ cup Whole milk"]);
  assert.notEqual(getRecipeSourceKey(source), getRecipeSourceKey({ ...source, servings: 4 }));
  assert.notEqual(getRecipeSourceKey(source), getRecipeSourceKey({ ...source, ingredients: [{ name: "Spaghetti", amount: "16 oz" }] }));
  assert.equal(getRecipeSourceKey(source), getRecipeSourceKey({ ...source, ingredients: source.ingredients.map(item => ({ ...item, price: 10 })) }));
});
