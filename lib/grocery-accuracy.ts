import { ingredientKey, parseIngredient, parseQuantity, combineQuantities, formatQuantity, convertQuantity, isPackageUnit, type Quantity } from "./ingredient-quantity.ts";
import type { PantryDecision } from "./shopping-progress.ts";
import { normalizePantry, type PantryEntry } from "./pantry.ts";
import { getGroceryDepartment, inferIngredientUsage } from "./grocery-department.ts";
export { mergeAmounts } from "./ingredient-quantity.ts";
type IngredientItem = {
    name: string;
    amount: string;
    price?: number;
};
type MealPlanItem = {
    day?: string;
    ingredients?: IngredientItem[];
    name?: string;
    notes?: string;
};
export type GroceryListItem = {
    category: string;
    name: string;
    item_key: string;
    estimated_price: number;
    price_status?: "unavailable";
    buy_amount?: string;
    needed_amount?: string;
    shortage_amount?: string;
    flexibility_note?: string;
    meal_names?: string[];
    usage_notes?: {
        meal: string;
        usage: string;
    }[];
    requirements?: Quantity[];
    requirement_key?: string;
    pantry_note?: string;
    review_required?: boolean;
    preparation_notes?: string[];
    pantry_question?: "unknown" | "low" | "incompatible";
    restock_requested?: boolean;
    pantry_decision_key?: string;
    pantry_answer?: PantryDecision["answer"];
};
export type GroceryIngredientSource = IngredientItem & {
    mealName: string;
    mealNotes: string;
};
export const getIngredientKey = ingredientKey;
export function aggregateIngredientItems(ingredients: GroceryIngredientSource[]): GroceryListItem[] {
    const groups = new Map<string, {
        name: string;
        known: Quantity[];
        unknown: string[];
        meals: Set<string>;
        usage: Map<string, string>;
        prep: Set<string>;
        review: boolean;
    }>();
    for (const ingredient of ingredients)
        for (const parsed of parseIngredient(ingredient.name, ingredient.amount)) {
            const key = getIngredientKey(parsed.name);
            if (!key)
                continue;
            const g = groups.get(key) ?? { name: parsed.name, known: [], unknown: [], meals: new Set<string>(), usage: new Map<string, string>(), prep: new Set<string>(), review: false };
            const quantity = parseQuantity(parsed.amount);
            if (quantity)
                g.known.push(quantity);
            else
                g.unknown.push(parsed.amount || "Amount unspecified");
            if (parsed.preparation)
                g.prep.add(parsed.preparation);
            g.review ||= parsed.reviewRequired;
            if (ingredient.mealName) {
                g.meals.add(ingredient.mealName);
                g.usage.set(ingredient.mealName, [parsed.amount, parsed.preparation, inferIngredientUsage(parsed.name, ingredient.mealName, ingredient.mealNotes)].filter(Boolean).join(" · "));
            }
            groups.set(key, g);
        }
    return [...groups].map(([key, g]) => {
        const quantities = combineQuantities(g.known), unknown = [...new Set(g.unknown)], meal_names = [...g.meals].sort();
        const needed = [...quantities.map(formatQuantity), ...unknown].join(" + ");
        return { item_key: key, name: g.name, category: getGroceryDepartment(g.name), requirements: quantities, needed_amount: needed, shortage_amount: needed,
            estimated_price: 0, price_status: "unavailable" as const, buy_amount: undefined, flexibility_note: g.review ? "Ingredient composition needs review" : quantities.some(q => isPackageUnit(q.unit)) ? "Confirm package size" : "Estimate unavailable; confirm product/package size",
            meal_names, usage_notes: [...g.usage].map(([meal, usage]) => ({ meal, usage })).sort((a, b) => a.meal.localeCompare(b.meal)), preparation_notes: [...g.prep], review_required: g.review,
            requirement_key: JSON.stringify([key, quantities, unknown, meal_names]) };
    }).sort((a, b) => a.name.localeCompare(b.name));
}
const departments = ["Produce", "Meat & Seafood", "Dairy & Eggs", "Bakery & Bread", "Pantry & Dry Goods", "Condiments & Sauces", "Spices & Seasonings", "Frozen", "Beverages", "Restock", "Other"];
export function sortGroceryGroups(groups: Record<string, GroceryListItem[]>) { return Object.entries(groups).map(([category, items]) => [category, [...items].sort((a, b) => a.name.localeCompare(b.name))] as [
    string,
    GroceryListItem[]
]).sort(([a], [b]) => ((departments.indexOf(a) + 1) || 99) - ((departments.indexOf(b) + 1) || 99) || a.localeCompare(b)); }
export function deriveGroceryLists({ fullyStocked, runningLow, restock, weeklyMenu, savedDesserts, pantryItems = [], pantryEntries = [], restoredItems = [], removedGroceryItems = [], pantryDecisions = {} }: {
    fullyStocked: Set<string>;
    runningLow: Set<string>;
    restock: Set<string>;
    weeklyMenu: MealPlanItem[];
    savedDesserts: MealPlanItem[];
    pantryItems?: string[];
    pantryEntries?: PantryEntry[];
    restoredItems?: string[];
    removedGroceryItems?: string[];
    pantryDecisions?: Record<string, PantryDecision>;
}) {
    const entries = normalizePantry([...pantryItems, ...[...fullyStocked].map(name => ({ name, status: "stocked" })), ...[...runningLow].map(name => ({ name, status: "low" })), ...[...restock].map(name => ({ name, status: "restock" })), ...pantryEntries]);
    const pantry = new Map(entries.map(e => [getIngredientKey(e.name), e]));
    const all = aggregateIngredientItems([...weeklyMenu, ...savedDesserts].flatMap(m => (m.ingredients ?? []).map(i => ({ ...i, mealName: m.name || "Selected meal", mealNotes: m.notes || "" }))));
    const derivedGroceryList: GroceryListItem[] = [], skippedGroceryList: GroceryListItem[] = [], checkPantryList: GroceryListItem[] = [];
    for (const item of all) {
        const entry = pantry.get(item.item_key), forced = restoredItems.includes(item.item_key), quantities = item.requirements ?? [];
        const decisionKey = JSON.stringify([item.requirement_key, entry?.quantity, entry?.unit, entry?.status]);
        item.pantry_decision_key = decisionKey;
        const storedDecision = pantryDecisions[item.item_key];
        const decision = storedDecision?.requirement === decisionKey ? storedDecision.answer : undefined;
        const remaining = quantities.map(q => ({ ...q }));
        const qualitative = item.needed_amount !== quantities.map(formatQuantity).join(" + ");
        let note = "", covered = false;
        let question: GroceryListItem["pantry_question"] = item.review_required ? "incompatible" : undefined;
        const restockRequested = entry?.status === "restock";

        if (entry && !forced && !item.review_required) {
            if (decision === "enough" || (!decision && entry.confirmedFor === item.requirement_key)) {
                covered = true;
                note = "You confirmed enough for these selected recipes.";
            } else if (entry.quantity === undefined) {
                question = entry.status === "low" ? "low" : "unknown";
                note = "Amount unknown. Stock labels do not measure inventory.";
            } else {
                const index = remaining.findIndex(q => convertQuantity({ value: entry.quantity!, unit: entry.unit ?? "" }, q.unit) !== null);
                if (index >= 0 || entry.quantity === 0) {
                    if (index >= 0) {
                        const q = remaining[index];
                        const available = convertQuantity({ value: entry.quantity, unit: entry.unit ?? "" }, q.unit)!;
                        remaining[index] = { ...q, value: Math.max(0, Number((q.value - available).toFixed(6))) };
                    }
                    note = `Pantry: ${formatQuantity({ value: entry.quantity, unit: entry.unit ?? "" })} available.`;
                    covered = !qualitative && remaining.every(q => q.value <= .000001);
                    if (entry.quantity > 0 && (qualitative || remaining.some((q, i) => i !== index && q.value > 0))) question = "incompatible";
                } else {
                    question = "incompatible";
                    note = "Pantry quantity cannot be compared with recipe units. Check the package or measurement.";
                }
            }
        }

        const needsReview = question && !forced && decision !== "buy" && !restockRequested && !covered;
        const shortage = [
            ...remaining.filter(q => q.value > .000001).map(formatQuantity),
            ...(qualitative ? item.needed_amount?.split(" + ").filter(amount => !parseQuantity(amount)) ?? [] : []),
        ].join(" + ");
        const result = {
            ...item,
            pantry_note: note || undefined,
            pantry_question: needsReview ? question : undefined,
            pantry_answer: decision,
            restock_requested: restockRequested,
            shortage_amount: needsReview || question ? undefined : covered ? restockRequested ? undefined : "0" : shortage || item.needed_amount,
        };
        if (covered && !restockRequested) {
            skippedGroceryList.push(result);
        } else if (!removedGroceryItems.includes(item.item_key)) {
            if (needsReview) checkPantryList.push(result);
            else derivedGroceryList.push(result);
        }
    }
    const recipeKeys = new Set(all.map(i => i.item_key));
    for (const entry of entries.filter(e => e.status === "restock")) {
        const key = getIngredientKey(entry.name), item_key = `restock-${key}`;
        if (recipeKeys.has(key) || removedGroceryItems.includes(item_key))
            continue;
        derivedGroceryList.push({ name: entry.name, item_key, category: "Restock", estimated_price: 0, price_status: "unavailable", needed_amount: "Restock requested", shortage_amount: "Confirm quantity", flexibility_note: "Confirm package size", requirement_key: JSON.stringify([item_key, entry.quantity, entry.unit]) });
    }
    return { derivedGroceryList, checkPantryList, skippedGroceryList, pantryRequirements: all };
}
