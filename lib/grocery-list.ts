type IngredientItem = {
  name: string;
  amount: string;
  price?: number;
};

type MealPlanItem = {
  day?: string;
  ingredients?: IngredientItem[];
  name?: string;
};

export type GroceryListItem = {
  category: string;
  flexibility_note?: string;
  name: string;
  item_key: string;
  buy_amount?: string;
  estimated_price: number;
  meal_names?: string[];
  usage_notes?: Array<{ meal: string; usage: string }>;
  needed_amount?: string;
};

export type GroceryIngredientSource = IngredientItem & {
  mealName: string;
  mealNotes: string;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function normalizeIngredientName(itemName: string) {
  return safeTrim(itemName).toLowerCase();
}

// Keep varieties, dietary qualifiers, and food forms in the identity. Only
// explicit preparation suffixes and unambiguous aliases may be normalized.
export function getIngredientKey(itemName: string) {
  return normalizeIngredientName(itemName)
    .replace(/,\s*(?:chopped|diced|minced|sliced|shredded|grated|divided|drained|rinsed|peeled|to taste)(?:[\s,]+(?:and\s+)?(?:chopped|diced|minced|sliced|shredded|grated|divided|drained|rinsed|peeled|to taste))*$/g, "")
    .replace(/\belbow macaroni\b/g, "macaroni")
    .replace(/^(?:fresh )?garlic(?: cloves?)?$/g, "garlic")
    .replace(/\bcourgettes?\b/g, "zucchini")
    .replace(/\b(onions|carrots|peppers|beans|chickpeas|eggs|tortillas|noodles|apples|lemons|limes|bananas|cucumbers|mushrooms|scallions)\b/g, (word) => word.slice(0, -1))
    .replace(/\bpotatoes\b/g, "potato")
    .replace(/\btomatoes\b/g, "tomato")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferIngredientUsage(itemName: string, mealName: string, mealNotes: string) {
  const ingredient = normalizeIngredientName(itemName);
  const title = safeTrim(mealName);
  const notes = safeTrim(mealNotes);
  const lowerNotes = notes.toLowerCase();
  const lowerTitle = title.toLowerCase();

  const usageMatch = notes
    .split(/[.!?]/)
    .map((sentence) => safeTrim(sentence))
    .find((sentence) => sentence.toLowerCase().includes(ingredient));

  if (usageMatch) {
    return usageMatch.length > 120 ? `${usageMatch.slice(0, 117)}...` : usageMatch;
  }

  if (lowerTitle.includes(ingredient)) {
    return `Featured in ${title}.`;
  }

  if (/\bgarlic|onion|ginger|pepper|salt|paprika|cumin|seasoning|spice|herb\b/.test(ingredient)) {
    return "Used to season or build the flavor base.";
  }

  if (/\bcheese|sauce|salsa|cream|yogurt|dressing\b/.test(ingredient)) {
    return "Used as a sauce, topping, or creamy finishing ingredient.";
  }

  if (/\brice|pasta|tortilla|wrap|bread|bun|potato\b/.test(ingredient)) {
    return "Used as the base, side, or serving component.";
  }

  if (/\bchicken|beef|pork|turkey|shrimp|salmon|fish|tofu|beans\b/.test(ingredient)) {
    return "Used as a main protein in the meal.";
  }

  if (lowerNotes || lowerTitle) {
    return "Used in this meal's prep or plating.";
  }

  return "Used in this selected meal.";
}

function getGroceryDepartment(itemName: string) {
  const normalizedName = normalizeIngredientName(itemName);

  if (normalizedName.includes("[restock]")) {
    return "Restock";
  }

  if (/\bfrozen\b|\bice cream\b/.test(normalizedName)) return "Frozen";
  if (/\b(?:garlic|onion|chili) powder\b|\b(?:black|white|ground) pepper\b|\bpepper flakes\b/.test(normalizedName)) return "Spices & Seasonings";
  if (/\b(?:bread|buns?|rolls?|tortillas?|wraps?|pita|naan)\b/.test(normalizedName)) return "Bakery & Bread";
  if (/\b(?:sauce|salsa|dressing)\b/.test(normalizedName)) return "Condiments & Sauces";
  if (/\b(?:dried|ground) (?:basil|oregano|thyme|rosemary|cinnamon|cumin|nutmeg)\b/.test(normalizedName)) return "Spices & Seasonings";
  if (/\b(?:canned|dried|dry)\b|\b(?:broth|stock)\b|\bcoconut milk\b/.test(normalizedName)) return "Pantry & Dry Goods";
  if (/\b(?:tomato|tomatoes)\b/.test(normalizedName) && /\b(?:diced|crushed|paste|puree)\b/.test(normalizedName)) return "Pantry & Dry Goods";

  if (
    /\b(zucchini|celery|carrots?|onions?|potatoes?|tomatoes?|bell peppers?|red peppers?|green peppers?|yellow peppers?|orange peppers?|garlic|ginger|lettuce|spinach|broccoli|kale|cucumbers?|avocados?|apples?|bananas?|lemons?|limes?|cilantro|parsley|basil|green beans?|corn|mushrooms?|scallions?|snap peas?)\b/.test(
      normalizedName,
    )
  ) {
    return "Produce";
  }

  if (/\b(chicken|beef|steak|pork|sausage|bacon|turkey|shrimp|salmon|tilapia|fish|seafood)\b/.test(normalizedName)) {
    return "Meat & Seafood";
  }

  if (/\b(milk|cream|cheese|eggs?|butter|yogurt|sour cream|cream cheese|half-and-half)\b/.test(normalizedName)) {
    return "Dairy & Eggs";
  }

  if (/\b(bread|buns?|rolls?|tortillas?|wraps?|pita|naan)\b/.test(normalizedName)) {
    return "Bakery & Bread";
  }

  if (/\b(oil|vinegar|sauce|mustard|ketchup|mayo|dressing|salsa|honey|syrup|soy sauce|worcestershire|hot sauce)\b/.test(normalizedName)) {
    return "Condiments & Sauces";
  }

  if (/\b(salt|pepper|paprika|cumin|chili powder|seasoning|spice|oregano|thyme|cinnamon|nutmeg|garlic powder|onion powder)\b/.test(normalizedName)) {
    return "Spices & Seasonings";
  }

  if (/\b(rice|pasta|spaghetti|penne|rigatoni|rotini|fettuccine|linguine|macaroni|farfalle|angel hair|lasagna noodles?|flour|sugar|beans|chickpea|tomatoes|broth|stock|oats|quinoa|cereal|cornmeal|breadcrumbs)\b/.test(normalizedName)) {
    return "Pantry & Dry Goods";
  }

  if (/\b(frozen|ice cream)\b/.test(normalizedName)) {
    return "Frozen";
  }

  return "Other";
}

const UNITS: Record<string, { unit: string; factor: number }> = {
  cups: { unit: "cup", factor: 1 }, cup: { unit: "cup", factor: 1 },
  tbsp: { unit: "cup", factor: 1 / 16 }, tablespoon: { unit: "cup", factor: 1 / 16 }, tablespoons: { unit: "cup", factor: 1 / 16 },
  tsp: { unit: "cup", factor: 1 / 48 }, teaspoon: { unit: "cup", factor: 1 / 48 }, teaspoons: { unit: "cup", factor: 1 / 48 },
  lb: { unit: "oz", factor: 16 }, lbs: { unit: "oz", factor: 16 }, pound: { unit: "oz", factor: 16 }, pounds: { unit: "oz", factor: 16 },
  oz: { unit: "oz", factor: 1 }, ounce: { unit: "oz", factor: 1 }, ounces: { unit: "oz", factor: 1 },
  kg: { unit: "g", factor: 1000 }, g: { unit: "g", factor: 1 }, grams: { unit: "g", factor: 1 }, gram: { unit: "g", factor: 1 },
  ml: { unit: "ml", factor: 1 }, l: { unit: "ml", factor: 1000 }, liter: { unit: "ml", factor: 1000 }, liters: { unit: "ml", factor: 1000 },
};

function getAmountParts(amount: string) {
  const fractions: Record<string, string> = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };
  const normalized = safeTrim(amount).toLowerCase()
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, (fraction) => " " + fractions[fraction]).trim();
  const match = normalized.match(/^(?:(\d+)\s+)?(\d+\s*\/\s*\d+|\d+(?:\.\d+)?|\.\d+)\s*([a-z][a-z\s.-]*)?$/);
  if (!match) return null;
  const number = match[2].replace(/\s/g, "");
  const [numerator, denominator] = number.split("/").map(Number);
  const value = Number(match[1] ?? 0) + (denominator === undefined ? numerator : numerator / denominator);
  if (!Number.isFinite(value) || value < 0) return null;
  const rawUnit = safeTrim(match[3]).replace(/\.$/, "");
  const aliases: Record<string, string> = {
    cups: "cup", tablespoons: "tbsp", tablespoon: "tbsp", teaspoons: "tsp", teaspoon: "tsp",
    lbs: "lb", pound: "lb", pounds: "lb", ounce: "oz", ounces: "oz", gram: "g", grams: "g", liter: "l", liters: "l",
    boxes: "box", bunches: "bunch",
  };
  const countUnit = /^(cans|cloves|heads|packs|bags|cartons|jars|bottles|eggs|onions|pieces)$/.test(rawUnit)
    ? rawUnit.slice(0, -1) : rawUnit;
  return { value, unit: aliases[rawUnit] ?? countUnit };
}

export function mergeAmounts(baseAmount: string | undefined, nextAmount: string) {
  const amounts = [baseAmount ?? "", nextAmount].flatMap((amount) => amount.split(/\s+\+\s+/)).map(safeTrim).filter(Boolean);
  const groups = new Map<string, { value: number; unit: string; factor: number }>();
  const unknown: string[] = [];
  for (const amount of amounts) {
    const parts = getAmountParts(amount);
    if (!parts) { unknown.push(amount); continue; }
    const conversion = UNITS[parts.unit] ?? { unit: parts.unit, factor: 1 };
    const existing = groups.get(conversion.unit);
    const display = existing && existing.factor > conversion.factor ? existing : { unit: parts.unit, factor: conversion.factor };
    groups.set(conversion.unit, { ...display, value: parts.value * conversion.factor + (existing?.value ?? 0) });
  }
  return [...Array.from(groups.values()).map(({ value, unit, factor }) => {
    const total = Number((value / factor).toFixed(3));
    const countUnits = new Set(["can", "clove", "head", "bunch", "pack", "bag", "box", "carton", "jar", "bottle", "egg", "onion", "piece", "cup"]);
    const displayUnit = total !== 1 && countUnits.has(unit) ? unit + (unit === "box" || unit === "bunch" ? "es" : "s") : unit;
    return [total, displayUnit].filter((part) => part !== "").join(" ");
  }), ...unknown].join(" + ");
}

function estimatePackageAmount(itemName: string, neededAmount?: string) {
  const normalizedName = normalizeIngredientName(itemName);
  const normalizedAmount = safeTrim(neededAmount);
  const amountParts = getAmountParts(normalizedAmount);

  if (
    amountParts &&
    [
      "lb",
      "lbs",
      "pound",
      "pounds",
      "oz",
      "ounce",
      "ounces",
      "kg",
      "g",
    ].includes(amountParts.unit)
  ) {
    return normalizedAmount;
  }

  if (
    normalizedAmount &&
    !normalizedAmount.includes("+") &&
    /^(?:\d+(?:\.\d+)?)\s+(?:head|heads|bunch|bunches|pack|packs|bag|bags|box|boxes|carton|cartons|can|cans|jar|jars|bottle|bottles)$/i.test(
      normalizedAmount,
    )
  ) {
    return normalizedAmount;
  }

  if (normalizedAmount) {
    return undefined;
  }

  if (
    normalizedName.includes("flour") ||
    normalizedName.includes("sugar") ||
    normalizedName.includes("rice") ||
    normalizedName.includes("oats") ||
    normalizedName.includes("quinoa")
  ) {
    return "1 bag";
  }

  if (
    normalizedName.includes("pasta") ||
    normalizedName.includes("spaghetti") ||
    normalizedName.includes("penne") ||
    normalizedName.includes("rigatoni") ||
    normalizedName.includes("rotini") ||
    normalizedName.includes("fettuccine") ||
    normalizedName.includes("linguine") ||
    normalizedName.includes("macaroni") ||
    normalizedName.includes("farfalle") ||
    normalizedName.includes("angel hair") ||
    normalizedName.includes("lasagna noodles")
  ) {
    return "1 box";
  }

  if (
    normalizedName.includes("broth") ||
    normalizedName.includes("stock") ||
    normalizedName.includes("milk") ||
    normalizedName.includes("cream")
  ) {
    return "1 carton";
  }

  if (
    normalizedName.includes("oil") ||
    normalizedName.includes("vinegar") ||
    normalizedName.includes("dressing") ||
    normalizedName.includes("sauce") ||
    normalizedName.includes("syrup") ||
    normalizedName.includes("honey")
  ) {
    return "1 bottle";
  }

  if (
    normalizedName.includes("salt") ||
    normalizedName.includes("pepper") ||
    normalizedName.includes("paprika") ||
    normalizedName.includes("cumin") ||
    normalizedName.includes("seasoning") ||
    normalizedName.includes("spice")
  ) {
    return "1 container";
  }

  if (
    normalizedName.includes("beans") ||
    normalizedName.includes("chickpeas") ||
    normalizedName.includes("tomatoes") ||
    normalizedName.includes("coconut milk")
  ) {
    return "1 can";
  }

  if (
    normalizedName.includes("cheese") ||
    normalizedName.includes("tortilla") ||
    normalizedName.includes("bread")
  ) {
    return "1 pack";
  }

  if (normalizedName.includes("egg")) {
    return "1 carton";
  }

  if (
    normalizedName.includes("chicken") ||
    normalizedName.includes("beef") ||
    normalizedName.includes("pork") ||
    normalizedName.includes("turkey") ||
    normalizedName.includes("shrimp") ||
    normalizedName.includes("salmon") ||
    normalizedName.includes("fish")
  ) {
    return amountParts ? normalizedAmount : "1 pack";
  }

  if (
    normalizedName.includes("broccoli") ||
    normalizedName.includes("spinach") ||
    normalizedName.includes("lettuce") ||
    normalizedName.includes("kale") ||
    normalizedName.includes("carrot") ||
    normalizedName.includes("pepper") ||
    normalizedName.includes("onion") ||
    normalizedName.includes("potato") ||
    normalizedName.includes("tomato") ||
    normalizedName.includes("apple") ||
    normalizedName.includes("avocado")
  ) {
    return normalizedAmount.includes("+") ? "1 standard produce bundle" : "1 bag";
  }

  return "1 standard package";
}

function estimatePackagePrice(itemName: string, buyAmount?: string) {
  const normalizedName = normalizeIngredientName(itemName);
  const amountParts = getAmountParts(safeTrim(buyAmount));

  if (
    amountParts &&
    ["lb", "oz"].includes(amountParts.unit)
  ) {
    let pricePerUnit = 4;

    if (
      normalizedName.includes("shrimp") ||
      normalizedName.includes("salmon") ||
      normalizedName.includes("seafood")
    ) {
      pricePerUnit = 10;
    } else if (
      normalizedName.includes("beef") ||
      normalizedName.includes("steak")
    ) {
      pricePerUnit = 8;
    } else if (
      normalizedName.includes("chicken") ||
      normalizedName.includes("pork") ||
      normalizedName.includes("turkey")
    ) {
      pricePerUnit = 5;
    }

    const pounds = amountParts.unit === "oz" ? amountParts.value / 16 : amountParts.value;
    return Math.max(1, Number((pounds * pricePerUnit).toFixed(2)));
  }

  let estimate = 3;

  if (
    normalizedName.includes("shrimp") ||
    normalizedName.includes("salmon") ||
    normalizedName.includes("seafood")
  ) {
    estimate = 10;
  } else if (
    normalizedName.includes("chicken") ||
    normalizedName.includes("pork") ||
    normalizedName.includes("beef") ||
    normalizedName.includes("cheese")
  ) {
    estimate = 6;
  } else if (
    normalizedName.includes("oil") ||
    normalizedName.includes("sauce") ||
    normalizedName.includes("butter") ||
    normalizedName.includes("milk") ||
    normalizedName.includes("broth")
  ) {
    estimate = 4;
  } else if (
    normalizedName.includes("flour") ||
    normalizedName.includes("rice") ||
    normalizedName.includes("pasta") ||
    normalizedName.includes("spaghetti") ||
    normalizedName.includes("penne") ||
    normalizedName.includes("rigatoni") ||
    normalizedName.includes("rotini") ||
    normalizedName.includes("fettuccine") ||
    normalizedName.includes("linguine") ||
    normalizedName.includes("macaroni") ||
    normalizedName.includes("farfalle") ||
    normalizedName.includes("angel hair") ||
    normalizedName.includes("lasagna noodles") ||
    normalizedName.includes("beans") ||
    normalizedName.includes("potato") ||
    normalizedName.includes("produce") ||
    normalizedName.includes("carrot")
  ) {
    estimate = 2.5;
  }

  return Math.max(1, Number(estimate.toFixed(2)));
}

export function aggregateIngredientItems(ingredients: GroceryIngredientSource[]): GroceryListItem[] {
  const grouped = new Map<
    string,
    {
      buy_amount?: string;
      category: string;
      flexibility_note?: string;
      meal_names: Set<string>;
      name: string;
      needed_amount?: string;
      usage_notes: Map<string, string>;
    }
  >();

  ingredients.forEach((ingredient) => {
    const aggregateKey = getIngredientKey(ingredient.name);

    if (!aggregateKey) {
      return;
    }

    const existing = grouped.get(aggregateKey);
    const nextAmount = safeTrim(ingredient.amount);
    const displayName = safeTrim(ingredient.name);

    if (existing) {
      const nextMealNames = new Set(existing.meal_names);
      if (safeTrim(ingredient.mealName)) {
        nextMealNames.add(safeTrim(ingredient.mealName));
      }
      const nextUsageNotes = new Map(existing.usage_notes);
      if (safeTrim(ingredient.mealName)) {
        nextUsageNotes.set(
          safeTrim(ingredient.mealName),
          inferIngredientUsage(ingredient.name, ingredient.mealName, ingredient.mealNotes),
        );
      }

      grouped.set(aggregateKey, {
        buy_amount: estimatePackageAmount(
          existing.name,
          mergeAmounts(existing.needed_amount, nextAmount),
        ),
        category: getGroceryDepartment(existing.name),
        flexibility_note: undefined,
        meal_names: nextMealNames,
        name: existing.name,
        needed_amount: mergeAmounts(existing.needed_amount, nextAmount),
        usage_notes: nextUsageNotes,
      });
      return;
    }

    const usageNotes = new Map<string, string>();
    if (safeTrim(ingredient.mealName)) {
      usageNotes.set(
        safeTrim(ingredient.mealName),
        inferIngredientUsage(ingredient.name, ingredient.mealName, ingredient.mealNotes),
      );
    }

    grouped.set(aggregateKey, {
      buy_amount: estimatePackageAmount(displayName, nextAmount),
      category: getGroceryDepartment(displayName),
      flexibility_note: undefined,
      meal_names: new Set(safeTrim(ingredient.mealName) ? [safeTrim(ingredient.mealName)] : []),
      name: displayName,
      needed_amount: nextAmount,
      usage_notes: usageNotes,
    });
  });

  return Array.from(grouped.entries()).map(([itemKey, item]) => ({
    category: item.category,
    flexibility_note: item.flexibility_note,
    name: item.name,
    item_key: itemKey,
    buy_amount: item.buy_amount,
    estimated_price: estimatePackagePrice(item.name, item.buy_amount),
    meal_names: Array.from(item.meal_names).sort((left, right) => left.localeCompare(right)),
    usage_notes: Array.from(item.usage_notes.entries())
      .map(([meal, usage]) => ({ meal, usage }))
      .sort((left, right) => left.meal.localeCompare(right.meal)),
    needed_amount: item.needed_amount,
  })).sort((left, right) => left.name.localeCompare(right.name));
}

function estimateRestockPrice(itemName: string) {
  return estimatePackagePrice(itemName, estimatePackageAmount(itemName));
}

const GROCERY_DEPARTMENT_ORDER = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery & Bread",
  "Pantry & Dry Goods",
  "Condiments & Sauces",
  "Spices & Seasonings",
  "Frozen",
  "Beverages",
  "Restock",
  "Other",
];

function getDepartmentOrder(category: string) {
  const index = GROCERY_DEPARTMENT_ORDER.indexOf(category);
  return index === -1 ? GROCERY_DEPARTMENT_ORDER.length : index;
}

export function sortGroceryGroups(groups: Record<string, GroceryListItem[]>) {
  return Object.entries(groups)
    .map(([category, items]) => [
      category,
      [...items].sort((left, right) => left.name.localeCompare(right.name)),
    ] as [string, GroceryListItem[]])
    .sort(
      ([leftCategory], [rightCategory]) =>
        getDepartmentOrder(leftCategory) - getDepartmentOrder(rightCategory) ||
        leftCategory.localeCompare(rightCategory),
    );
}


export function deriveGroceryLists({ fullyStocked, runningLow, restock, weeklyMenu, savedDesserts, pantryItems = [], restoredItems = [], removedGroceryItems = [] }: {
  fullyStocked: Set<string>;
  runningLow: Set<string>;
  restock: Set<string>;
  weeklyMenu: MealPlanItem[];
  savedDesserts: MealPlanItem[];
  pantryItems?: string[];
  restoredItems?: string[];
  removedGroceryItems?: string[];
}) {
    const pantryKeys = new Set([...fullyStocked, ...runningLow, ...pantryItems].map(getIngredientKey).filter(Boolean));
    const restockKeys = new Set([...restock].map(getIngredientKey).filter(Boolean));
    const allMeals = [...weeklyMenu, ...savedDesserts];
    const rawGroceryList: GroceryIngredientSource[] = [];
    const rawSkippedList: GroceryIngredientSource[] = [];

    allMeals.forEach((meal) => {
      const mealName = safeTrim(meal.name) || "Selected meal";

      (meal.ingredients ?? []).forEach((ingredient) => {
        const ingredientKey = getIngredientKey(ingredient.name);
        const restoreKey = getIngredientKey(ingredient.name);
        const ingName = normalizeIngredientName(ingredient.name);
        const isForced =
          restoredItems.includes(restoreKey) ||
          restoredItems.includes(ingName);
        const isOwned = pantryKeys.has(ingredientKey) && !restockKeys.has(ingredientKey);
        const sourcedIngredient = {
          ...ingredient,
          mealName,
          mealNotes: safeTrim((meal as { notes?: string }).notes),
        };

        if (!isOwned || isForced) {
          rawGroceryList.push(sourcedIngredient);
        } else {
          rawSkippedList.push(sourcedIngredient);
        }
      });
    });

    const directGroceryList = aggregateIngredientItems(rawGroceryList).filter(
      (item) => !removedGroceryItems.includes(item.item_key),
    );
    const recipeKeys = new Set(rawGroceryList.map((item) => getIngredientKey(item.name)));
    const activeGroceryKeys = new Set(directGroceryList.map((item) => item.item_key));
    const directSkippedList = aggregateIngredientItems(rawSkippedList).filter(
      (item) => !activeGroceryKeys.has(item.item_key),
    );

    const restockItems: GroceryListItem[] = Array.from(restock)
      .filter((item) => !recipeKeys.has(getIngredientKey(item)))
      .filter((item, index, items) => items.findIndex((other) => getIngredientKey(other) === getIngredientKey(item)) === index)
      .map((restockItem) => ({
        category: "Restock",
        buy_amount: estimatePackageAmount(restockItem),
        name: safeTrim(restockItem),
        item_key: `restock-${getIngredientKey(restockItem)}`,
        needed_amount: "Restock pantry",
        estimated_price: Math.max(1, estimateRestockPrice(restockItem)),
      }))
      .filter((item) => !removedGroceryItems.includes(item.item_key))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      derivedGroceryList: [...directGroceryList, ...restockItems],
      skippedGroceryList: directSkippedList,
    };
}
