import { ingredientKey, parseIngredient } from "./ingredient-quantity.ts";
import { mealFamily } from "./meal-variety.ts";

export type PantryAvailabilityInput = {
  combinedPantryItems?: string;
  fullyStocked?: string[];
  runningLow?: string[];
  restock?: string[];
};

// Reuse reviewed grocery equivalents. Keep fresh/dried, product varieties and
// dietary formulations distinct. Composite or alternative names are unresolved.
export function pantryMatchKey(name: string) {
  const parsed = parseIngredient(name);
  return parsed.length === 1 && !parsed[0].reviewRequired ? ingredientKey(parsed[0].name) : "";
}

export function availablePantryNames(input: PantryAvailabilityInput) {
  const restock = new Set((Array.isArray(input.restock) ? input.restock : []).map(pantryMatchKey).filter(Boolean));
  const names = [
    ...(typeof input.combinedPantryItems === "string" ? input.combinedPantryItems : "").split(/[,;\n]/),
    ...(Array.isArray(input.fullyStocked) ? input.fullyStocked : []), ...(Array.isArray(input.runningLow) ? input.runningLow : []),
  ];
  const unique = new Map<string, string>();
  for (const name of names) {
    const key = pantryMatchKey(name);
    if (key && !restock.has(key)) unique.set(key, name.trim());
  }
  return [...unique.values()];
}

export function pantryIngredientAvailable(name: string, available: Set<string>) {
  const key = pantryMatchKey(name);
  return !!key && available.has(key);
}

export function distinctPantryDinners<T extends { name: string; ingredients: { name: string }[] }>(meals: T[]) {
  const seen = new Set<string>();
  return meals.filter(meal => {
    const ingredients = [...new Set(meal.ingredients.map(ingredient => pantryMatchKey(ingredient.name)))].sort();
    const family = mealFamily(meal.name) ?? ingredientKey(meal.name).replace(/\b(?:simple|easy|quick|classic)\b/g, "").trim();
    const signature = JSON.stringify([family, ingredients]);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}
