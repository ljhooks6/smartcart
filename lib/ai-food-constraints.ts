import { getIngredientKey } from "./grocery-list";
import { parseAvoidanceItems } from "./meal-request-normalization";

export type FoodPreferences = { diet?: string; avoidIngredients?: string; availableEquipment?: string[] };
const normalized = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-\u2013]/g, " ").replace(/\s+/g, " ").trim();
const words = (s: string) => normalized(s).replace(/[^a-z0-9]+/g, " ").trim();
const includesWord = (text: string, word: string) => (` ${words(text)} `).includes(` ${words(word)} `);

// These checks catch common explicit violations; product labels and cross-contact
// cannot be inferred from generated ingredient names.
export function ingredientViolations(names: string[], preferences: FoodPreferences) {
  const avoid = parseAvoidanceItems(preferences.avoidIngredients);
  const categories: Record<string, string> = { dairy: "dairy-free", gluten: "gluten-free", eggs: "egg-free", nuts: "nut-free", "tree nuts": "tree-nut-free", peanuts: "peanut-free" };
  const diet = normalized([preferences.diet ?? "", ...avoid.map(item => categories[item] ?? "")].join(", "));
  const errors: string[] = [];
  for (const name of names) {
    // Label qualifiers are not ingredients: "peanut-free oat milk" still
    // allows oat milk, while "peanut-free almond milk" still contains almond.
    const n = normalized(name)
      .replace(/\b(?:certified |labeled )?free of\b.*$/g, "")
      .replace(/\b(?:peanuts?|tree nuts?|almonds?|walnuts?|cashews?)(?:\s+and\s+(?:peanuts?|tree nuts?|almonds?|walnuts?|cashews?))*\s+free\b/g, "");
    for (const item of avoid) if (includesWord(n, item) || includesWord(n, item + "s")) errors.push(`Excluded ingredient: ${name}`);
    const vegan = /\bvegan\b/.test(diet);
    const dairyFree = vegan || /\bdairy free\b/.test(diet);
    const nutFree = /\bnut free\b|\bnuts free\b/.test(diet);
    if ((nutFree || /\bpeanut free\b/.test(diet)) && /\bpeanuts?\b/.test(n)) errors.push(`Peanut restriction: ${name}`);
    if ((nutFree || /\btree nuts? free\b/.test(diet)) && /\b(?:almonds?|walnuts?|pecans?|cashews?|pistachios?|hazelnuts?|macadamias?|brazil nuts?|pine nuts?)\b/.test(n)) errors.push(`Tree-nut restriction: ${name}`);
    const plantDairy = /\b(?:vegan|plant based|dairy free)\b/.test(n) || /\b(?:oat|soy|coconut|rice|almond|cashew|hemp|pea)\s+(?:milk|cream|yogurt|butter)\b/.test(n) || /\b(?:peanut|almond|cashew|sunflower|cocoa|apple) butter\b/.test(n);
    if (dairyFree && !plantDairy && /\b(?:milk|cream|cheese|butter|yogurt|whey|casein|ghee)\b/.test(n)) errors.push(`Dairy restriction: ${name}`);
    if ((vegan || /\begg free\b/.test(diet)) && /\beggs?\b|\bmayonnaise\b/.test(n) && !/\bvegan\b|\begg free\b/.test(n)) errors.push(`Egg restriction: ${name}`);
    const animal = /\b(?:chicken|turkey|beef|pork|lamb|bacon|ham|sausage|fish|salmon|tuna|shrimp|gelatin|lard)\b/.test(n);
    if ((vegan || /\bvegetarian\b/.test(diet)) && animal && !/\bvegan\b|\bplant based\b|\bmeatless\b/.test(n)) errors.push(`Meat restriction: ${name}`);
    if (vegan && /\bhoney\b/.test(n)) errors.push(`Vegan restriction: ${name}`);
    if (/\bgluten free\b/.test(diet) && !/\bgluten free\b/.test(n)) {
      if (/\b(?:wheat|barley|rye|flour|bread|pasta|macaroni|spaghetti|breadcrumbs|soy sauce|tortillas?|oats)\b/.test(n) && !/\b(?:rice|corn|chickpea|almond|coconut|tapioca) flour\b/.test(n)) errors.push(`Gluten restriction: ${name}`);
    }
  }
  return [...new Set(errors)];
}

export function pantryViolations(names: string[], pantry: string) {
  const allowed = new Set(pantry.split(/[,;\n]/).map(getIngredientKey).filter(Boolean));
  return names.filter(name => getIngredientKey(name) !== "water" && !allowed.has(getIngredientKey(name))).map(name => `Not in pantry: ${name}`);
}

export function equipmentViolations(text: string, equipment?: string[]) {
  if (!equipment) return [];
  const available = new Set(equipment.map(normalized));
  const rules: Array<[string, RegExp]> = [
    ["oven", /\boven\b|\bbake\b|\bbroil\b|\broast\b/],
    ["stovetop", /\bstovetop\b|\bskillet\b|\bsaucepan\b|\bsaut[eÃ©]\b/],
    ["microwave", /\bmicrowave\b/], ["grill", /\bgrill\b|\bgrilled\b/],
    ["air fryer", /\bair fryer\b|\bair fried\b/],
    ["slow cooker", /\bslow cooker\b|\bcrockpot\b/], ["blender", /\bblender\b|\bfood processor\b/],
  ];
  return rules.filter(([name, pattern]) => !available.has(name) && pattern.test(normalized(text))).map(([name]) => `Unavailable equipment: ${name}`);
}

export function recipeViolations(recipe: { ingredients: string[]; steps: string[] }, planned: Array<{name: string; amount: string}> | undefined, preferences: FoodPreferences) {
  const steps = recipe.steps.join(" ");
  const errors = [...ingredientViolations(planned?.map(i => i.name) ?? recipe.ingredients, preferences), ...equipmentViolations(steps, preferences.availableEquipment)];
  if (planned) {
    const expected = planned.map(i => normalized(`${i.amount} ${i.name}`)).sort();
    const returned = recipe.ingredients.map(normalized).sort();
    if (JSON.stringify(expected) !== JSON.stringify(returned)) errors.push("Preserve the exact planned ingredient list and quantities");
    const names = planned.map(i => normalized(i.name)).join(" ");
    const extras = ["salt", "pepper", "garlic", "flour", "sugar", "butter", "vanilla", "broth", "cilantro", "honey", "cream", "cheese", "egg", "milk", "peanut", "almond", "walnut", "cashew", "onion", "lemon", "lime", "tomato", "cinnamon"];
    for (const extra of extras) {
      let stepText = normalized(steps);
      if (extra === "salt") stepText = stepText.replace(/\bsalted\b/g, "salt");
      if (extra === "flour" && /\boats?\b/.test(names)) stepText = stepText.replace(/(?:grind|blend)[^.]*oats?[^.]*flour/g, "");
      if (!includesWord(names, extra) && !includesWord(names, extra + "s") && (includesWord(stepText, extra) || includesWord(stepText, extra + "s"))) errors.push(`Unplanned ingredient in steps: ${extra}`);
    }
    const rawPoultry = planned.some(i => /\b(?:chicken|turkey)\b/i.test(i.name) && !/\b(?:cooked|rotisserie|deli|canned|broth|stock|smoked)\b/i.test(i.name));
    if (rawPoultry && !/165\s*°?\s*F|74\s*°?\s*C/i.test(steps)) errors.push("Include a thermometer check of 165°F/74°C for poultry");
  }
  return [...new Set(errors)];
}


