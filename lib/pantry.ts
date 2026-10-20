import { ingredientKey, parseIngredient, normalizeUnit, parseQuantity } from "./ingredient-quantity.ts";
import { searchIngredientNames } from "./ingredient-search.ts";
export type PantryEntry = {
    name: string;
    quantity?: number;
    unit?: string;
    status: "owned" | "stocked" | "low" | "restock";
    confirmedFor?: string;
};
export function normalizePantry(raw: unknown): PantryEntry[] {
    if (!Array.isArray(raw))
        return [];
    const result = new Map<string, PantryEntry>();
    for (const value of raw.slice(0, 200)) {
        const item = typeof value === "string" ? { name: value, status: "owned" } : value;
        if (!item || typeof item.name !== "string" || !item.name.trim() || item.name.length > 4000)
            continue;
        const parsed = parseIngredient(item.name), name = parsed.length === 1 ? parsed[0].name : item.name.trim(), key = parsed.length === 1 ? ingredientKey(name) : name.toLowerCase();
        if (!key)
            continue;
        const q = typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity >= 0 && item.quantity <= 1000000 ? item.quantity : undefined;
        const inName = parsed.length === 1 ? parseQuantity(parsed[0].amount) : null;
        const next: PantryEntry = { name, quantity: q ?? inName?.value, unit: typeof item.unit === "string" ? normalizeUnit(item.unit).slice(0, 30) : inName?.unit, status: ["owned", "stocked", "low", "restock"].includes(item.status) ? item.status : "owned", ...(typeof item.confirmedFor === "string" && item.confirmedFor.length <= 6000 ? { confirmedFor: item.confirmedFor } : {}) };
        const old = result.get(key);
        if (!old || next.quantity !== undefined || old.quantity === undefined)
            result.set(key, next);
    }
    return [...result.values()];
}
export function pantryStorageKey(owner: string) { return `mealcaddie-pantry-v2:${owner || "guest"}`; }
export function readOwnedPantry(value: unknown, owner: string) { if (!value || typeof value !== "object" || !("owner" in value) || value.owner !== owner)
    return []; return normalizePantry("entries" in value ? value.entries : []); }
export function pantryNames(entries: PantryEntry[]) { return entries.filter(e => e.quantity !== 0 && (e.status !== "restock" || (e.quantity ?? 0) > 0)).map(e => e.name); }
export function pantryCloudPayload(entries: PantryEntry[]) { return entries.map(({ name, quantity, unit, status }) => ({ name, ...(quantity !== undefined ? { quantity } : {}), ...(unit ? { unit } : {}), status })); }
export function addPantryEntry(entries: PantryEntry[], name: string) { const key = ingredientKey(name); return entries.some(e => ingredientKey(e.name) === key) ? entries : normalizePantry([...entries, { name, status: "owned" }]); }
export function searchPantry(options: readonly string[], entries: PantryEntry[], query: string) {
    return searchIngredientNames(options, entries, query);
}
