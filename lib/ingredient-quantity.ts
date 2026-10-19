// Ordinary shopping arithmetic only. No density, package-size or allergen proof.
export type Quantity = {
    value: number;
    unit: string;
};
const fractions: Record<string, string> = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };
const aliases: Record<string, string> = { cups: "cup", teaspoons: "tsp", teaspoon: "tsp", tablespoons: "tbsp", tablespoon: "tbsp", pounds: "lb", pound: "lb", lbs: "lb", ounces: "oz", ounce: "oz", grams: "g", gram: "g", kilograms: "kg", milliliters: "ml", millilitres: "ml", liters: "l", litres: "l", liter: "l", litre: "l", pieces: "each", piece: "each", count: "each", items: "each", item: "each", cloves: "clove", heads: "head", bunches: "bunch", boxes: "box", cans: "can", bottles: "bottle", jars: "jar", packs: "pack", bags: "bag", cartons: "carton", packages: "package", packets: "packet", containers: "container", tins: "tin" };
export function normalizeUnit(unit: string) { const u = unit.toLowerCase().trim().replace(/\.$/, "").replace(/^fl\.?\s*oz\.?$/, "fl oz"); return aliases[u] ?? u; }
export function parseQuantity(raw: string): Quantity | null {
    if (typeof raw !== "string") return null;
    const s = raw.trim().toLowerCase().replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, f => " " + fractions[f]).trim();
    const m = s.match(/^(?:(\d+)\s+)?(\d+\s*\/\s*\d+|\d+(?:\.\d+)?|\.\d+)\s*([a-z][a-z .-]*)?$/);
    if (!m)
        return null;
    const [n, d] = m[2].replace(/\s/g, "").split('/').map(Number), value = Number(m[1] ?? 0) + (d === undefined ? n : n / d);
    if (!Number.isFinite(value) || value < 0 || value > 1000000)
        return null;
    return { value, unit: normalizeUnit(m[3] ?? "") };
}
const units: Record<string, {
    dimension: string;
    factor: number;
}> = {
    "": { dimension: "count", factor: 1 }, each: { dimension: "count", factor: 1 },
    g: { dimension: "mass", factor: 1 }, kg: { dimension: "mass", factor: 1000 }, oz: { dimension: "mass", factor: 28.349523125 }, lb: { dimension: "mass", factor: 453.59237 },
    ml: { dimension: "volume", factor: 1 }, l: { dimension: "volume", factor: 1000 }, cup: { dimension: "volume", factor: 236.5882365 }, tbsp: { dimension: "volume", factor: 14.78676478125 }, tsp: { dimension: "volume", factor: 4.92892159375 }, "fl oz": { dimension: "volume", factor: 29.5735295625 },
};
export function unitDefinition(unit: string) { const key = normalizeUnit(unit); return units[key] ?? { dimension: `unit:${key}`, factor: 1 }; }
export function isPackageUnit(unit: string) { return /^(can|bottle|jar|bag|pack|package|packet|box|carton|bunch|head|container|tin)$/.test(normalizeUnit(unit)); }
export function convertQuantity(quantity: Quantity, to: string): number | null {
    const a = unitDefinition(quantity.unit), b = unitDefinition(to);
    if (a.dimension !== b.dimension || isPackageUnit(quantity.unit) || isPackageUnit(to))
        return null;
    return quantity.value * a.factor / b.factor;
}
export function formatQuantity(q: Quantity) { const n = Number(q.value.toFixed(3)); const plural = n !== 1 && ["cup", "can", "bottle", "jar", "bag", "pack", "box", "bunch", "clove", "head", "carton"].includes(q.unit) ? q.unit + (["box", "bunch"].includes(q.unit) ? "es" : "s") : q.unit; return `${n}${plural ? " " + plural : ""}`; }
export function combineQuantities(values: Quantity[]): Quantity[] {
    const groups = new Map<string, {
        quantity: Quantity;
        base: number;
        factor: number;
    }>();
    for (const q of values) {
        const def = unitDefinition(q.unit), old = groups.get(def.dimension);
        const prefer = !old || def.factor >= old.factor ? q : old.quantity;
        const factor = unitDefinition(prefer.unit).factor;
        groups.set(def.dimension, { quantity: { value: 0, unit: prefer.unit }, base: (old?.base ?? 0) + q.value * def.factor, factor });
    }
    return [...groups.values()].map(g => ({ unit: g.quantity.unit, value: Number((g.base / g.factor).toFixed(6)) }));
}
export function mergeAmounts(a: string | undefined, b: string) { const known: Quantity[] = [], unknown: string[] = []; for (const s of [a ?? "", b].flatMap(v => v.split(/\s+\+\s+/)).map(v => v.trim()).filter(Boolean)) {
    const q = parseQuantity(s);
    if (q)
        known.push(q);
    else
        unknown.push(s);
} return [...combineQuantities(known).map(formatQuantity), ...unknown].join(" + "); }
export type ParsedIngredient = {
    name: string;
    amount: string;
    preparation: string;
    reviewRequired: boolean;
};
function canonicalName(name: string) {
    return name.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/\belbow macaroni\b/g, "macaroni").replace(/^(?:fresh )?garlic(?: cloves?)?$/, "garlic")
        .replace(/\bcourgettes?\b/g, "zucchini").replace(/\bscallions?\b/g, "green onion").replace(/\b(onions|carrots|peppers|beans|chickpeas|eggs|tortillas|noodles|apples|lemons|limes|bananas|cucumbers|mushrooms)\b/g, w => w.slice(0, -1))
        .replace(/\bpotatoes\b/g, "potato").replace(/\btomatoes\b/g, "tomato").replace(/[^\p{L}\p{N}%]+/gu, " ").replace(/\s+/g, " ").trim();
}
export function parseIngredient(rawName: string, rawAmount = ""): ParsedIngredient[] {
    let name = typeof rawName === "string" ? rawName.trim().replace(/\s+/g, " ") : "", amount = typeof rawAmount === "string" ? rawAmount.trim() : "", preparation = "", reviewRequired = false;
    const prep = name.match(/,\s*((?:(?:finely|roughly|thinly|freshly)\s+)?(?:juiced|zested|grated|chopped|diced|minced|sliced|shredded|divided|drained|rinsed|peeled|crushed|to taste)(?:\b.*))$/i);
    if (prep) {
        preparation = prep[1];
        name = name.slice(0, prep.index).trim();
    }
    const lead = name.match(/^((?:(?:\d+)\s+)?(?:\d+\/\d+|\d+(?:\.\d+)?|[½¼¾⅓⅔⅛]))\s+(?:(cups?|tsp|tbsp|oz|lb|g|kg|ml|l|each|cloves?|cans?|bottles?|jars?|packs?|bags?|boxes|box|teaspoons?|tablespoons?|ounces?|pounds?)\s+)?(?:of\s+)?(.+)$/i);
    if (lead) {
        const leading = [lead[1], lead[2]].filter(Boolean).join(" ");
        name = lead[3];
        if (!amount || /^(?:as needed|to taste)$/i.test(amount))
            amount = leading;
        else {
            const a = parseQuantity(leading), b = parseQuantity(amount);
            // Repeated name/count notation is harmless; contradictory measurements need review.
            if (a && b) {
                if (b.unit && canonicalName(b.unit) === canonicalName(name))
                    b.unit = "";
                const comparable = convertQuantity(a, b.unit);
                reviewRequired = comparable === null || Math.abs(comparable - b.value) > .000001;
            }
            else
                reviewRequired = true;
        }
    }
    const count = parseQuantity(amount);
    if (count?.unit && canonicalName(count.unit) === canonicalName(name))
        amount = formatQuantity({ value: count.value, unit: "" });
    const taste = /\s+to taste$/i.test(name);
    name = name.replace(/\s+to taste$/i, "");
    if (taste && !amount)
        amount = "to taste";
    if (/^salt\s*(?:and|&)\s*(?:black\s+)?pepper$/i.test(name) && (!parseQuantity(amount)))
        return [{ name: "Salt", amount: amount || "to taste", preparation, reviewRequired }, { name: "Black pepper", amount: amount || "to taste", preparation, reviewRequired }];
    return [{ name, amount, preparation, reviewRequired: reviewRequired || /\s+(?:and|or)\s+|\s*&\s*|\//i.test(name) }];
}
export function ingredientKey(raw: string) { const parsed = parseIngredient(raw); return canonicalName(parsed.length === 1 ? parsed[0].name : raw); }
