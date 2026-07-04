"use client";

import { useMemo, useState } from "react";

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

type GroceryListItem = {
  category: string;
  flexibility_note?: string;
  name: string;
  item_key: string;
  buy_amount?: string;
  estimated_price: number;
  meal_names?: string[];
  needed_amount?: string;
};

type GroceryIngredientSource = IngredientItem & {
  mealName: string;
};

type CustomItem = {
  id: string;
  name: string;
  isChecked: boolean;
};

type UseSmartCartGroceryArgs = {
  formatCurrency: (value: number) => string;
  fullyStocked: Set<string>;
  onCopyError: (message: string) => void;
  restock: Set<string>;
  runningLow: Set<string>;
  savedDesserts: MealPlanItem[];
  weeklyMenu: MealPlanItem[];
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function normalizeIngredientName(itemName: string) {
  return safeTrim(itemName).toLowerCase();
}

function compactIngredientName(itemName: string) {
  return normalizeIngredientName(itemName)
    .replace(/\b(fresh|dried|large|small|medium|whole|chopped|diced|minced|sliced|shredded|grated|optional)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const canonicalIngredientPatterns: Array<[RegExp, string]> = [
  [/\b(zucchini|courgette)\b/, "zucchini"],
  [/\bcelery\b/, "celery"],
  [/\bcarrot\b/, "carrots"],
  [/\bonion\b/, "onions"],
  [/\bpotato\b/, "potatoes"],
  [/\btomato\b/, "tomatoes"],
  [/\bgreen beans?\b/, "green beans"],
  [/\bbell pepper\b|\b(red|green|yellow|orange) peppers?\b/, "bell peppers"],
  [/\bgarlic\b/, "garlic"],
  [/\bginger\b/, "ginger"],
  [/\blettuce\b|\bromaine\b/, "lettuce"],
  [/\bspinach\b/, "spinach"],
  [/\bbroccoli\b/, "broccoli"],
  [/\brice\b/, "rice"],
  [/\bpasta\b|\bspaghetti\b|\bpenne\b|\brigatoni\b|\brotini\b|\bfettuccine\b|\blinguine\b|\bmacaroni\b/, "pasta"],
  [/\bflour\b/, "flour"],
  [/\bsugar\b/, "sugar"],
  [/\bmilk\b/, "milk"],
  [/\begg\b/, "eggs"],
  [/\bbutter\b/, "butter"],
  [/\bcheese\b|\bcheddar\b|\bmozzarella\b|\bparmesan\b/, "cheese"],
  [/\bchicken\b/, "chicken"],
  [/\bbeef\b|\bsteak\b/, "beef"],
  [/\bpork\b|\bsausage\b|\bbacon\b/, "pork"],
  [/\bturkey\b/, "turkey"],
  [/\bshrimp\b/, "shrimp"],
  [/\bsalmon\b/, "salmon"],
  [/\btilapia\b|\bfish\b/, "fish"],
  [/\btofu\b/, "tofu"],
  [/\bbeans?\b|\bblack beans\b|\bpinto beans\b|\bchickpeas?\b/, "beans"],
  [/\btortilla\b|\bwrap\b/, "tortillas or wraps"],
];

function getCanonicalIngredientName(itemName: string) {
  const compactName = compactIngredientName(itemName);
  const matchedPattern = canonicalIngredientPatterns.find(([pattern]) => pattern.test(compactName));
  return matchedPattern?.[1] ?? compactName;
}

function toDisplayName(itemName: string) {
  return safeTrim(itemName)
    .split(" ")
    .map((word) =>
      word.length > 2 ? `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}` : word,
    )
    .join(" ");
}

function getGroceryDepartment(itemName: string) {
  const normalizedName = normalizeIngredientName(itemName);

  if (normalizedName.includes("[restock]")) {
    return "Restock";
  }

  if (
    /\b(zucchini|celery|carrot|onion|potato|tomato|bell pepper|red pepper|green pepper|yellow pepper|orange pepper|garlic|ginger|lettuce|spinach|broccoli|kale|cucumber|avocado|apple|banana|lemon|lime|cilantro|parsley|basil|green bean|corn|mushroom)\b/.test(
      normalizedName,
    )
  ) {
    return "Produce";
  }

  if (/\b(chicken|beef|steak|pork|sausage|bacon|turkey|shrimp|salmon|tilapia|fish|seafood)\b/.test(normalizedName)) {
    return "Meat & Seafood";
  }

  if (/\b(milk|cream|cheese|egg|butter|yogurt|sour cream|cream cheese|half-and-half)\b/.test(normalizedName)) {
    return "Dairy & Eggs";
  }

  if (/\b(bread|bun|roll|tortilla|wrap|pita|naan)\b/.test(normalizedName)) {
    return "Bakery & Bread";
  }

  if (/\b(oil|vinegar|sauce|mustard|ketchup|mayo|dressing|salsa|honey|syrup|soy sauce|worcestershire|hot sauce)\b/.test(normalizedName)) {
    return "Condiments & Sauces";
  }

  if (/\b(salt|pepper|paprika|cumin|chili powder|seasoning|spice|oregano|thyme|cinnamon|nutmeg|garlic powder|onion powder)\b/.test(normalizedName)) {
    return "Spices & Seasonings";
  }

  if (/\b(rice|pasta|flour|sugar|beans|chickpea|tomatoes|broth|stock|oats|quinoa|cereal|cornmeal|breadcrumbs)\b/.test(normalizedName)) {
    return "Pantry & Dry Goods";
  }

  if (/\b(frozen|ice cream)\b/.test(normalizedName)) {
    return "Frozen";
  }

  return "Other";
}

function getAmountParts(amount: string) {
  const normalizedAmount = safeTrim(amount).toLowerCase();
  const match = normalizedAmount.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);

  if (!match) {
    return null;
  }

  return {
    value: Number(match[1]),
    unit: safeTrim(match[2]),
  };
}

function mergeAmounts(baseAmount: string | undefined, nextAmount: string) {
  if (!baseAmount) {
    return safeTrim(nextAmount);
  }

  const normalizedBase = safeTrim(baseAmount);
  const normalizedNext = safeTrim(nextAmount);
  const baseParts = getAmountParts(normalizedBase);
  const nextParts = getAmountParts(normalizedNext);

  if (!baseParts || !nextParts) {
    return normalizedBase === normalizedNext
      ? normalizedBase
      : `${normalizedBase} + ${normalizedNext}`;
  }

  if (baseParts.unit !== nextParts.unit) {
    return `${normalizedBase} + ${normalizedNext}`;
  }

  const totalValue = baseParts.value + nextParts.value;
  const displayValue = Number.isInteger(totalValue) ? totalValue : totalValue.toFixed(2);
  return `${displayValue} ${baseParts.unit}`;
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

  if (
    normalizedName.includes("flour") ||
    normalizedName.includes("sugar") ||
    normalizedName.includes("rice") ||
    normalizedName.includes("oats") ||
    normalizedName.includes("quinoa")
  ) {
    return "1 bag";
  }

  if (normalizedName.includes("pasta")) {
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
    ["lb", "lbs", "pound", "pounds"].includes(amountParts.unit)
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

    return Math.max(1, Number((amountParts.value * pricePerUnit).toFixed(2)));
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
    normalizedName.includes("beans") ||
    normalizedName.includes("potato") ||
    normalizedName.includes("produce") ||
    normalizedName.includes("carrot")
  ) {
    estimate = 2.5;
  }

  return Math.max(1, Number(estimate.toFixed(2)));
}

function getFlexibleStapleMeta(itemName: string) {
  const normalizedName = normalizeIngredientName(itemName);

  if (
    normalizedName.includes("jasmine rice") ||
    normalizedName.includes("basmati rice") ||
    normalizedName === "white rice" ||
    normalizedName.endsWith(" white rice")
  ) {
    return {
      flexibilityNote: "One bag of jasmine, basmati, or white rice will usually cover these meals.",
      key: "flexible-rice",
      name: "Rice",
    };
  }

  if (
    normalizedName === "whole milk" ||
    normalizedName === "2% milk" ||
    normalizedName === "skim milk" ||
    normalizedName.endsWith(" milk")
  ) {
    return {
      flexibilityNote: "One carton of the milk you prefer will usually cover these meals.",
      key: "flexible-milk",
      name: "Milk",
    };
  }

  if (
    normalizedName === "pasta" ||
    normalizedName.includes("spaghetti") ||
    normalizedName.includes("penne") ||
    normalizedName.includes("rigatoni") ||
    normalizedName.includes("rotini") ||
    normalizedName.includes("fettuccine") ||
    normalizedName.includes("linguine") ||
    normalizedName.includes("macaroni") ||
    normalizedName.includes("farfalle") ||
    normalizedName.includes("angel hair")
  ) {
    return {
      flexibilityNote: "One box of your preferred pasta shape will usually cover these meals.",
      key: "flexible-pasta",
      name: "Pasta",
    };
  }

  if (
    normalizedName.includes("russet potato") ||
    normalizedName.includes("yukon gold potato") ||
    normalizedName.includes("red potato") ||
    normalizedName === "potatoes" ||
    normalizedName === "potato"
  ) {
    return {
      flexibilityNote: "One bag of potatoes will usually cover these meals.",
      key: "flexible-potatoes",
      name: "Potatoes",
    };
  }

  if (
    normalizedName === "yellow onion" ||
    normalizedName === "white onion" ||
    normalizedName === "red onion" ||
    normalizedName === "sweet onion" ||
    normalizedName === "onion" ||
    normalizedName === "onions"
  ) {
    return {
      flexibilityNote: "A small bag of onions will usually cover these meals.",
      key: "flexible-onions",
      name: "Onions",
    };
  }

  if (
    normalizedName.includes("flour tortilla") ||
    normalizedName.includes("corn tortilla") ||
    normalizedName.includes("wrap") ||
    normalizedName.includes("burrito tortilla")
  ) {
    return {
      flexibilityNote: "One pack of tortillas or wraps will usually cover these meals.",
      key: "flexible-tortillas",
      name: "Tortillas or wraps",
    };
  }

  if (normalizedName.includes("chicken broth") || normalizedName.includes("chicken stock")) {
    return {
      flexibilityNote: "Chicken broth or chicken stock will both work for these meals.",
      key: "flexible-chicken-broth",
      name: "Chicken broth or stock",
    };
  }

  if (
    normalizedName.includes("vegetable broth") ||
    normalizedName.includes("vegetable stock")
  ) {
    return {
      flexibilityNote: "Vegetable broth or vegetable stock will both work for these meals.",
      key: "flexible-vegetable-broth",
      name: "Vegetable broth or stock",
    };
  }

  if (normalizedName.includes("beef broth") || normalizedName.includes("beef stock")) {
    return {
      flexibilityNote: "Beef broth or beef stock will both work for these meals.",
      key: "flexible-beef-broth",
      name: "Beef broth or stock",
    };
  }

  if (
    normalizedName.includes("diced tomatoes") ||
    normalizedName.includes("crushed tomatoes") ||
    normalizedName === "canned tomatoes" ||
    normalizedName.endsWith(" canned tomatoes")
  ) {
    return {
      flexibilityNote: "One can of diced or crushed tomatoes will usually work here.",
      key: "flexible-canned-tomatoes",
      name: "Canned tomatoes",
    };
  }

  if (normalizedName.includes("parmesan") || normalizedName.includes("pecorino")) {
    return {
      flexibilityNote:
        "One tub of Parmesan or another grated hard cheese will usually cover these meals.",
      key: "flexible-grated-cheese",
      name: "Grated hard cheese",
    };
  }

  if (
    normalizedName.includes("cheddar") ||
    normalizedName.includes("mozzarella") ||
    normalizedName.includes("monterey jack") ||
    normalizedName.includes("colby jack") ||
    normalizedName.includes("mexican blend") ||
    normalizedName.includes("shredded cheese")
  ) {
    return {
      flexibilityNote:
        "One bag of cheddar, mozzarella, or another melting cheese will usually work here.",
      key: "flexible-shredded-cheese",
      name: "Shredded cheese",
    };
  }

  return {
    flexibilityNote: undefined,
    key: normalizedName,
    name: safeTrim(itemName),
  };
}

function singularize(value: string) {
  return value.endsWith("s") ? value.slice(0, -1) : value;
}

function getIngredientMatchKeys(itemName: string) {
  const stapleMeta = getFlexibleStapleMeta(itemName);
  const keys = new Set<string>();
  const normalizedName = normalizeIngredientName(itemName);
  const normalizedDisplayName = normalizeIngredientName(stapleMeta.name);
  const canonicalName = getCanonicalIngredientName(itemName);

  if (normalizedName) {
    keys.add(normalizedName);
    keys.add(singularize(normalizedName));
  }

  if (stapleMeta.key) {
    keys.add(stapleMeta.key);
    keys.add(singularize(stapleMeta.key));
  }

  if (normalizedDisplayName) {
    keys.add(normalizedDisplayName);
    keys.add(singularize(normalizedDisplayName));
  }

  if (canonicalName) {
    keys.add(canonicalName);
    keys.add(singularize(canonicalName));
  }

  return Array.from(keys).filter(Boolean);
}

function getAggregateKey(itemName: string) {
  const stapleMeta = getFlexibleStapleMeta(itemName);
  const canonicalName = getCanonicalIngredientName(itemName);

  if (stapleMeta.key !== normalizeIngredientName(itemName)) {
    return stapleMeta.key;
  }

  return canonicalName || stapleMeta.key;
}

function aggregateIngredientItems(ingredients: GroceryIngredientSource[]): GroceryListItem[] {
  const grouped = new Map<
    string,
    {
      buy_amount?: string;
      category: string;
      flexibility_note?: string;
      meal_names: Set<string>;
      name: string;
      needed_amount?: string;
    }
  >();

  ingredients.forEach((ingredient) => {
    const stapleMeta = getFlexibleStapleMeta(ingredient.name);
    const aggregateKey = getAggregateKey(ingredient.name);

    if (!aggregateKey) {
      return;
    }

    const existing = grouped.get(aggregateKey);
    const nextAmount = safeTrim(ingredient.amount);
    const displayName =
      stapleMeta.key === normalizeIngredientName(ingredient.name)
        ? toDisplayName(getCanonicalIngredientName(ingredient.name) || stapleMeta.name)
        : stapleMeta.name;

    if (existing) {
      const nextMealNames = new Set(existing.meal_names);
      if (safeTrim(ingredient.mealName)) {
        nextMealNames.add(safeTrim(ingredient.mealName));
      }

      grouped.set(aggregateKey, {
        buy_amount: estimatePackageAmount(
          existing.name,
          mergeAmounts(existing.needed_amount, nextAmount),
        ),
        category: existing.category,
        flexibility_note: existing.flexibility_note ?? stapleMeta.flexibilityNote,
        meal_names: nextMealNames,
        name: existing.name,
        needed_amount: mergeAmounts(existing.needed_amount, nextAmount),
      });
      return;
    }

    grouped.set(aggregateKey, {
      buy_amount: estimatePackageAmount(displayName, nextAmount),
      category: getGroceryDepartment(displayName),
      flexibility_note: stapleMeta.flexibilityNote,
      meal_names: new Set(safeTrim(ingredient.mealName) ? [safeTrim(ingredient.mealName)] : []),
      name: displayName,
      needed_amount: nextAmount,
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

function sortGroceryGroups(groups: Record<string, GroceryListItem[]>) {
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

export function useSmartCartGrocery({
  formatCurrency,
  fullyStocked,
  onCopyError,
  restock,
  runningLow,
  savedDesserts,
  weeklyMenu,
}: UseSmartCartGroceryArgs) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [isGroceryOpen, setIsGroceryOpen] = useState(false);
  const [restoredItems, setRestoredItems] = useState<string[]>([]);
  const [removedGroceryItems, setRemovedGroceryItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [newCustomItem, setNewCustomItem] = useState("");

  const { derivedGroceryList, skippedGroceryList } = useMemo(() => {
    const pantry = [...Array.from(fullyStocked), ...Array.from(runningLow)];
    const validPantryKeys = new Set(
      pantry
        .filter((item) => typeof item === "string")
        .flatMap((item) => getIngredientMatchKeys(item))
        .filter((item) => item.length > 1),
    );

    const allMeals = [...weeklyMenu, ...savedDesserts];
    const rawGroceryList: GroceryIngredientSource[] = [];
    const rawSkippedList: GroceryIngredientSource[] = [];

    allMeals.forEach((meal) => {
      const mealName = safeTrim(meal.name) || "Selected meal";

      (meal.ingredients ?? []).forEach((ingredient) => {
        const ingredientKeys = getIngredientMatchKeys(ingredient.name);
        const restoreKey = getAggregateKey(ingredient.name);
        const ingName = normalizeIngredientName(ingredient.name);
        const isForced =
          restoredItems.includes(restoreKey) ||
          restoredItems.includes(ingName);
        const isOwned = ingredientKeys.some((key) => validPantryKeys.has(key));
        const sourcedIngredient = { ...ingredient, mealName };

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
    const directSkippedList = aggregateIngredientItems(rawSkippedList);

    const restockItems: GroceryListItem[] = Array.from(restock)
      .map((restockItem) => ({
        category: "Restock",
        buy_amount: estimatePackageAmount(restockItem),
        name: safeTrim(restockItem),
        item_key: `restock-${normalizeIngredientName(restockItem)}`,
        needed_amount: "Restock pantry",
        estimated_price: Math.max(1, estimateRestockPrice(restockItem)),
      }))
      .filter((item) => !removedGroceryItems.includes(item.item_key))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      derivedGroceryList: [...directGroceryList, ...restockItems],
      skippedGroceryList: directSkippedList,
    };
  }, [
    fullyStocked,
    removedGroceryItems,
    restock,
    restoredItems,
    runningLow,
    savedDesserts,
    weeklyMenu,
  ]);

  const displayGroceriesByCategory = useMemo(() => {
    const grouped = derivedGroceryList.reduce<Record<string, GroceryListItem[]>>(
      (accumulator, item) => {
        const category = item.category || "Other";
        if (!accumulator[category]) {
          accumulator[category] = [];
        }
        accumulator[category].push(item);
        return accumulator;
      },
      {},
    );

    return sortGroceryGroups(grouped);
  }, [derivedGroceryList]);

  const skippedGroceriesByCategory = useMemo(() => {
    const grouped = skippedGroceryList.reduce<Record<string, GroceryListItem[]>>(
      (accumulator, item) => {
        const category = item.category || "Other";
        if (!accumulator[category]) {
          accumulator[category] = [];
        }
        accumulator[category].push(item);
        return accumulator;
      },
      {},
    );

    return sortGroceryGroups(grouped);
  }, [skippedGroceryList]);

  const shoppingListText = useMemo(() => {
    let listText = displayGroceriesByCategory
      .map(([category, items]) =>
        `${category}\n${items
          .map(
            (item) =>
              `- ${item.name}${item.needed_amount ? ` | Need: ${item.needed_amount}` : ""}${item.buy_amount ? ` | Buy: ${item.buy_amount}` : ""}${item.meal_names?.length ? ` | For: ${item.meal_names.join(", ")}` : ""} (${formatCurrency(item.estimated_price)})`,
          )
          .join("\n")}`,
      )
      .join("\n\n");

    if (customItems.length > 0) {
      listText += "\n\nEXTRAS & HOUSEHOLD:\n";
      listText += customItems
        .map((item) => `- [${item.isChecked ? "x" : " "}] ${item.name}`)
        .join("\n");
    }

    return listText;
  }, [customItems, displayGroceriesByCategory, formatCurrency]);

  const totalCost = useMemo(
    () => derivedGroceryList.reduce((sum, item) => sum + item.estimated_price, 0),
    [derivedGroceryList],
  );

  function toggleCheckedItem(itemKey: string) {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
  }

  async function handleCopyShoppingList() {
    try {
      await navigator.clipboard.writeText(shoppingListText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      onCopyError(error instanceof Error ? error.message : "Failed to copy shopping list.");
    }
  }

  function handleAddCustomItem() {
    if (!safeTrim(newCustomItem)) {
      return;
    }

    setCustomItems((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: safeTrim(newCustomItem),
        isChecked: false,
      },
    ]);
    setNewCustomItem("");
  }

  function resetGroceryState() {
    setCheckedItems(new Set());
    setCopied(false);
    setIsGroceryOpen(false);
    setRestoredItems([]);
    setRemovedGroceryItems([]);
    setCustomItems([]);
    setNewCustomItem("");
  }

  return {
    checkedItems,
    copied,
    customItems,
    displayGroceriesByCategory,
    handleAddCustomItem,
    handleCopyShoppingList,
    isGroceryOpen,
    newCustomItem,
    resetGroceryState,
    restoredItems,
    setCustomItemChecked: (id: string, isChecked: boolean) =>
      setCustomItems((current) =>
        current.map((item) => (item.id === id ? { ...item, isChecked } : item)),
      ),
    setGroceryOpen: setIsGroceryOpen,
    setNewCustomItem,
    skippedGroceriesByCategory,
    toggleCheckedItem,
    totalCost,
    removeCustomItem: (id: string) =>
      setCustomItems((current) => current.filter((item) => item.id !== id)),
    removeGroceryItem: (itemKey: string) =>
      setRemovedGroceryItems((current) =>
        current.includes(itemKey) ? current : [...current, itemKey],
      ),
    removeRestoredItem: (name: string) =>
      setRestoredItems((current) =>
        current.filter(
          (currentName) => currentName !== getAggregateKey(name),
        ),
      ),
    restoreSkippedItem: (name: string) =>
      setRestoredItems((current) => {
        const normalizedName = getAggregateKey(name);
        return current.includes(normalizedName) ? current : [...current, normalizedName];
      }),
  };
}
