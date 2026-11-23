import { normalizePantry, type PantryEntry } from "./pantry.ts";
import { availablePantryNames, pantryMatchKey, type PantryAvailabilityInput } from "./pantry-availability.ts";
import { parseIngredient, parseQuantity, convertQuantity, unitDefinition, isPackageUnit } from "./ingredient-quantity.ts";

export type PantryPlanInput = PantryAvailabilityInput & { mealSourceMode?: string; pantryInventory?: PantryEntry[] };
export const pantryQuantityMessage = "Pantry Only needs measured on-hand amounts. Open Pantry and enter quantities with compatible units for the ingredients you want to use. Amount unknown, stock labels and package sizes do not establish enough stock. You can also choose Pantry + store pickup; keep your dietary restrictions entered.";

export function measuredPantry(input: PantryPlanInput) {
  const available = new Set(availablePantryNames(input).map(pantryMatchKey));
  return normalizePantry(input.pantryInventory).filter(entry => {
    const unit = entry.unit || "";
    return entry.status !== "restock" && available.has(pantryMatchKey(entry.name)) &&
      entry.quantity !== undefined && entry.quantity > 0 && !isPackageUnit(unit) &&
      (!unitDefinition(unit).dimension.startsWith("unit:") || unit === "clove");
  });
}
export function pantryQuantityProblem(input: PantryPlanInput) {
  return input.mealSourceMode === "pantry-only" && !measuredPantry(input).length ? pantryQuantityMessage : null;
}

type Dish = { ingredients: { name: string; amount: string }[] };
// One ledger across all returned dinners and treats. Trial deductions are
// committed only for a complete dish, never for a rejected partial recipe.
// No density, package-size, arbitrary alias or model-confidence conversions.
export function fitPantryPlan<M extends Dish, D extends Dish>(meals: M[], desserts: D[], input: PantryPlanInput) {
  let stock = new Map(measuredPantry(input).map(entry => [pantryMatchKey(entry.name), { value: entry.quantity!, unit: entry.unit || "" }]));
  const omitted: string[] = [];
  function accept(dish: Dish) {
    const trial = new Map([...stock].map(([key,q]) => [key,{...q}]));
    for (const ingredient of dish.ingredients) {
      const parsed = parseIngredient(ingredient.name, ingredient.amount);
      if (parsed.length !== 1 || parsed[0].reviewRequired) { omitted.push("An ingredient identity or amount needs review."); return false; }
      const amount = parseQuantity(parsed[0].amount), owned = trial.get(pantryMatchKey(parsed[0].name));
      if (!amount || amount.value <= 0 || !owned) { omitted.push("An ingredient has no compatible measured stock."); return false; }
      const used = convertQuantity(amount, owned.unit);
      if (used === null) { omitted.push("Ingredient units cannot be converted reliably. Enter a measured amount instead of a package size."); return false; }
      if (used > owned.value + 0.000001) { omitted.push("The available stock does not cover the combined recipe amounts for this household."); return false; }
      owned.value = Math.max(0, owned.value - used);
    }
    stock = trial;
    return true;
  }
  const selectedMeals = meals.filter(accept);
  const selectedDesserts = selectedMeals.length ? desserts.filter(accept) : [];
  return { meals: selectedMeals, desserts: selectedDesserts, omitted, remaining: [...stock] };
}
