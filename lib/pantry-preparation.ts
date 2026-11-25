import { ingredientKey } from "./ingredient-quantity.ts";
import type { PantryEntry } from "./pantry.ts";

// Confirmations are carried in ingredient names, so existing inventory and
// recipe JSON preserve them without a new database column or inferred yields.
export function preparationChoices(name: string): string[] {
  const key = ingredientKey(name);
  if (key === "rice") return ["Dry white rice", "Dry brown rice", "Cooked rice"];
  if (/^(?:white|brown|jasmine|basmati|arborio|wild) rice$/.test(key)) return [`Dry ${name.toLowerCase()}`, `Cooked ${name.toLowerCase()}`];
  if (/^(?:black bean|chickpea|garbanzo bean|kidney bean|pinto bean|white bean|lentil)$/.test(key)) return [`Dried ${name.toLowerCase()}`, `Cooked ${name.toLowerCase()}`, `Canned ${name.toLowerCase()} (drained)`];
  if (/^canned (?:.*bean|chickpea|lentil)$/.test(key)) return [`${name} (drained)`];
  return [];
}
export function preparationIssue(name: string) {
  if (preparationChoices(name).length) return `Confirm whether ${name} is dry, cooked or canned/drained, then measure that exact form.`;
  if (/^(?:dry|dried) .*\b(?:beans?|chickpeas?|lentils?)\b/i.test(name)) return `Dried legumes are not supported by this initial Pantry Only cooking contract. Prepare them separately, then enter the actual cooked quantity; do not convert the dry amount.`;
  return null;
}
export function pantryPreparationProblem(entries: PantryEntry[]) {
  return entries.filter(e => e.status !== "restock" && (e.quantity ?? 0) > 0).map(e => preparationIssue(e.name)).filter(Boolean).join(" ") || null;
}
export function clarifyPreparation(entry: PantryEntry, name: string): PantryEntry {
  if (!preparationChoices(entry.name).includes(name)) throw Error("Choose a listed preparation form.");
  return { name, status: entry.status, unit: entry.unit }; // Deliberately clear quantity; no yield conversion.
}
