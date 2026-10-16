import { allergens } from "./dietary-safety";

export type Allergen = typeof allergens[number];
export type Unit = "g" | "ml" | "each";
export const catalogVersion = "2026-10-16.2";
export const referenceReviewDate = "2026-10-16";
export const referenceSources = {
  fda: "https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information/frequently-asked-questions-food-allergen-labeling-guidance-industry",
  labels: "https://www.fda.gov/consumers/consumer-updates/have-food-allergies-read-label",
  milk: "https://www.foodallergy.org/living-food-allergy/food-allergy-essentials/common-allergens/milk",
  sesame: "https://www.foodallergy.org/living-food-allergy/food-allergy-essentials/common-allergens/sesame",
  soy: "https://www.foodallergy.org/living-food-allergy/food-allergy-essentials/common-allergens/soy",
} as const;

export type FoodProfile = {
  id: string; name: string; aliases: readonly string[]; sources: readonly Allergen[];
  unit: Unit; estimatedUnitCost: number; animal: boolean;
  // Generic identity, never a verified brand, label, cross-contact or medical claim.
  evidence: "generic-single-ingredient"; reference: keyof typeof referenceSources;
};
function food(id: string, name: string, aliases: string[], unit: Unit, cost: number,
  sources: Allergen[] = [], animal = false): FoodProfile {
  return { id, name, aliases: [name, ...aliases], unit, estimatedUnitCost: cost,
    sources, animal, evidence: "generic-single-ingredient", reference: "fda" };
}
// Deliberately exact names. No default "no allergens" for an unrecognized food.
// Prices are illustrative ingredient-use estimates, not store/package quotes.
export const foodCatalog: readonly FoodProfile[] = [
  food("water", "Water", [], "ml", 0),
  food("rice", "White rice", ["rice", "long grain white rice", "jasmine rice", "basmati rice"], "g", .003),
  food("brown-rice", "Brown rice", [], "g", .004),
  food("quinoa", "Quinoa", [], "g", .008),
  food("oats", "Rolled oats", ["oats", "plain rolled oats"], "g", .005),
  food("potato", "Potatoes", ["potato", "russet potato", "russet potatoes"], "g", .003),
  food("sweet-potato", "Sweet potato", ["sweet potatoes"], "g", .004),
  food("carrot", "Carrots", ["carrot"], "g", .003),
  food("tomato", "Tomatoes", ["tomato", "roma tomatoes"], "g", .005),
  food("onion", "Onions", ["onion", "yellow onion", "yellow onions"], "g", .003),
  food("garlic", "Garlic", ["garlic cloves", "garlic clove"], "g", .01),
  food("broccoli", "Broccoli", ["broccoli florets"], "g", .005),
  food("spinach", "Spinach", [], "g", .008),
  food("cabbage", "Cabbage", ["green cabbage"], "g", .003),
  food("zucchini", "Zucchini", ["courgette"], "g", .005),
  food("pepper", "Bell peppers", ["bell pepper", "red bell pepper", "green bell pepper"], "g", .006),
  food("mushroom", "Mushrooms", ["mushroom"], "g", .009),
  food("green-beans", "Green beans", [], "g", .005),
  food("cauliflower", "Cauliflower", ["cauliflower florets"], "g", .005),
  food("white-beans", "Cooked plain white beans", ["plain cooked white beans"], "g", .004),
  food("cornmeal", "Plain yellow cornmeal", [], "g", .003),
  food("cucumber", "Cucumber", ["cucumbers"], "g", .004),
  food("apple", "Apples", ["apple"], "g", .004),
  food("pear", "Pears", ["pear"], "g", .005),
  food("banana", "Bananas", ["banana"], "g", .002),
  food("berries", "Blueberries", [], "g", .012),
  food("lemon", "Lemon", ["lemons"], "each", .6),
  food("lime", "Lime", ["limes"], "each", .4),
  food("parsley", "Parsley", ["fresh parsley"], "g", .03),
  food("cilantro", "Cilantro", ["fresh cilantro"], "g", .03),
  food("basil", "Basil", ["fresh basil"], "g", .04),
  food("olive-oil", "Olive oil", ["extra virgin olive oil"], "ml", .008),
  food("salt", "Salt", ["table salt"], "g", .001),
  food("black-pepper", "Black pepper", ["ground black pepper"], "g", .03),
  food("paprika", "Paprika", ["ground paprika"], "g", .03),
  food("cumin", "Cumin", ["ground cumin"], "g", .03),
  food("oregano", "Oregano", ["dried oregano"], "g", .03),
  food("cinnamon", "Cinnamon", ["ground cinnamon"], "g", .025),
  food("sugar", "Sugar", ["granulated sugar"], "g", .002),
  food("cocoa", "Unsweetened cocoa powder", ["pure cocoa powder"], "g", .02),
  food("lentils", "Dry red lentils", ["red lentils"], "g", .004),
  food("chickpeas", "Cooked plain chickpeas", ["plain cooked chickpeas"], "g", .004),
  food("black-beans", "Cooked plain black beans", ["plain cooked black beans"], "g", .004),
  food("chicken", "Chicken breast", ["plain chicken breast", "boneless skinless chicken breast"], "g", .012, [], true),
  food("chicken-thigh", "Chicken thighs", ["boneless skinless chicken thighs"], "g", .009, [], true),
  food("turkey", "Plain ground turkey", ["ground turkey"], "g", .012, [], true),
  food("beef", "Plain ground beef", ["ground beef"], "g", .014, [], true),
  food("pork", "Plain pork chops", ["pork chops"], "g", .012, [], true),
  food("salmon", "Plain salmon fillet", ["salmon", "salmon fillet"], "g", .022, ["Fish"], true),
  food("cod", "Plain cod fillet", ["cod", "cod fillet"], "g", .018, ["Fish"], true),
  food("shrimp", "Plain shrimp", ["shrimp", "prawns", "prawn"], "g", .022, ["Crustacean shellfish"], true),
  food("egg", "Eggs", ["egg", "chicken eggs", "duck eggs", "quail eggs"], "each", .3, ["Eggs"], true),
  food("milk", "Milk", ["whole milk", "goat milk", "sheep milk", "lactose free milk"], "ml", .002, ["Milk"], true),
  food("wheat-flour", "Wheat flour", ["all purpose wheat flour", "semolina", "durum wheat flour"], "g", .002, ["Wheat"]),
  food("peanut", "Peanuts", ["peanut", "groundnuts", "groundnut", "arachis"], "g", .008, ["Peanuts"]),
  food("almond", "Almonds", ["almond"], "g", .015, ["Tree nuts"]),
  food("cashew", "Cashews", ["cashew"], "g", .018, ["Tree nuts"]),
  food("soybean", "Soybeans", ["soya beans", "edamame"], "g", .006, ["Soy"]),
  food("sesame", "Sesame seeds", ["sesame seed", "benne seeds", "gingelly seeds"], "g", .015, ["Sesame"]),
];

export function normalizeFoodName(value: string) {
  return value.normalize("NFKC").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’']/g, "").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}
const byId = new Map(foodCatalog.map(f => [f.id, f]));
const byName = new Map(foodCatalog.flatMap(f => f.aliases.map(a => [normalizeFoodName(a), f] as const)));
export function profileById(id: string) { return byId.get(id); }
export function resolveFoodName(raw: string) {
  if (typeof raw !== "string" || raw.length > 300 || /[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/.test(raw)) return undefined;
  const name = normalizeFoodName(raw).replace(/\s*\[restock\]$/, "")
    .replace(/^\d+(?:[./]\d+)?(?:\s+\d+\/\d+)?\s*(?:g|grams?|kg|ml|milliliters?|cups?|tbsps?|tsps?|oz|lbs?)\s+/, "")
    .replace(/^(?:fresh|raw|chopped|diced|peeled|sliced)\s+/, "");
  return byName.get(name);
}

// Positive detection is independent of exact catalog resolution. Derivatives
// conservatively remain excluded; labeling exemptions are not clinical advice.
const sourcePatterns: Record<Allergen, RegExp> = {
  Milk: /\b(?:milk|buttermilk|cheese|cream|butter|yogh?urt|whey|casein(?:ates?)?|ghee|curds?|lactalbumin|lactoglobulin|lactoferrin)\b/i,
  Eggs: /\b(?:eggs?|albumen|albumin|ovalbumin|ovomucoid|meringue|mayonnaise|mayo|aioli)\b/i,
  Fish: /\b(?:fish|salmon|cod|tuna|anchov(?:y|ies)|sardines?|haddock|tilapia|bonito|surimi|dashi|worcestershire)\b/i,
  "Crustacean shellfish": /\b(?:shrimps?|prawns?|crabs?|lobsters?|crayfish|crawfish|krill|scampi|belacan)\b/i,
  "Tree nuts": /\b(?:almonds?|walnuts?|cashews?|pecans?|pistachios?|hazelnuts?|filberts?|macadamias?|brazil nuts?|pine nuts?|marzipan|praline|gianduja)\b/i,
  Peanuts: /\b(?:peanuts?|groundnuts?|arachis|goober(?:s| peas)?)\b/i,
  Wheat: /\b(?:wheat|semolina|durum|spelt|farro|bulgur|couscous|seitan|einkorn|emmer|triticale|breadcrumbs?|panko|soy sauce|shoyu)\b/i,
  Soy: /\b(?:soy|soya|soybeans?|tofu|tempeh|edamame|miso|tamari|shoyu)\b/i,
  Sesame: /\b(?:sesame|tahini|tahina|tehina|benne|benniseed|gingelly|gomasio|sesamol|sesamum indicum|sesemolina|sim sim|til)\b/i,
};
export function mentionedSources(raw: string): Allergen[] {
  const resolved = resolveFoodName(raw);
  if (resolved) return [...resolved.sources];
  // A plant-alternative name is not animal milk evidence; it still cannot pass
  // exact ingredient resolution without an approved complete formulation.
  const text = normalizeFoodName(raw).replace(/\bcocoa butter\b|\bcream of tartar\b/g, "")
    .replace(/\b(?:oat|almond|soy|rice|coconut|cashew|pea|peanut) (?:milk|cream|butter|yogurt)\b/g,
    value => value.split(" ")[0]).replace(/\b(?:milk|egg|peanut|soy|sesame|wheat|nut|dairy|gluten) free\b/g, "");
  return allergens.filter(a => sourcePatterns[a].test(text));
}

export type IngredientPortion = { foodId: string; quantity: number };
export const homemadeComponents: Readonly<Record<string, { name: string; parts: readonly IngredientPortion[] }>> = {
  "lemon-parsley-dressing": { name: "Homemade lemon-parsley dressing", parts: [
    { foodId: "olive-oil", quantity: 5 }, { foodId: "lemon", quantity: .25 },
    { foodId: "parsley", quantity: 3 }, { foodId: "salt", quantity: .5 },
  ] },
  "tomato-garlic-sauce": { name: "Homemade tomato-garlic sauce", parts: [
    { foodId: "tomato", quantity: 180 }, { foodId: "garlic", quantity: 4 },
    { foodId: "olive-oil", quantity: 5 }, { foodId: "onion", quantity: 50 },
    { foodId: "oregano", quantity: .5 }, { foodId: "salt", quantity: .5 },
  ] },
};
