import { ingredientKey, formatQuantity } from "./ingredient-quantity.ts";
import { searchPantry, type PantryEntry } from "./pantry.ts";
import { catalogSuggestion, isExactIngredientMatch } from "./ingredient-search.ts";

export const PANTRY_PAGE_SIZE = 12;

// UI grouping only: use the same identity as storage and grocery calculations.
// Similar names must not imply matching dietary formulations.
export function pantryGroups(entries: PantryEntry[], options: Record<string, readonly string[]>) {
  const categories = new Map<string, string>();
  for (const [category, names] of Object.entries(options)) {
    for (const name of names) if (!categories.has(ingredientKey(name))) categories.set(ingredientKey(name), category);
  }
  const grouped = new Map<string, PantryEntry[]>();
  for (const entry of entries) {
    const category = categories.get(ingredientKey(entry.name)) ?? catalogSuggestion(entry.name)?.category ?? "Other & custom";
    grouped.set(category, [...(grouped.get(category) ?? []), entry]);
  }
  return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([name, items]) => ({
    name, entries: items.sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export function pantryPickerMatches(entries: PantryEntry[], options: Record<string, readonly string[]>, query: string) {
  const inventory = new Map(entries.map(entry => [ingredientKey(entry.name), entry]));
  return searchPantry(Object.values(options).flat(), entries, query).map(name => ({
    name, key: ingredientKey(name), entry: inventory.get(ingredientKey(name)), exact: isExactIngredientMatch(name, query),
  }));
}

export function pantrySummary(entry: PantryEntry) {
  const amount = entry.quantity === undefined ? "Amount unknown" : formatQuantity({ value: entry.quantity, unit: entry.unit || "each" });
  const status = { owned: "", stocked: "Fully stocked label", low: "Running low", restock: "Restock" }[entry.status];
  return [amount, status].filter(Boolean).join(" · ");
}
