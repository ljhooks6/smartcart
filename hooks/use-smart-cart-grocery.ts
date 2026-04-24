"use client";

import { useMemo, useState } from "react";

type IngredientItem = {
  name: string;
  amount: string;
  price?: number;
};

type MealPlanItem = {
  ingredients?: IngredientItem[];
};

type GroceryListItem = {
  category: string;
  name: string;
  buy_amount?: string;
  estimated_price: number;
  needed_amount?: string;
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

function aggregateIngredientItems(ingredients: IngredientItem[]): GroceryListItem[] {
  const grouped = new Map<
    string,
    { buy_amount?: string; name: string; needed_amount?: string }
  >();

  ingredients.forEach((ingredient) => {
    const normalizedName = normalizeIngredientName(ingredient.name);
    if (!normalizedName) {
      return;
    }

    const existing = grouped.get(normalizedName);
    const nextAmount = safeTrim(ingredient.amount);

    if (existing) {
      grouped.set(normalizedName, {
        buy_amount: estimatePackageAmount(existing.name, mergeAmounts(existing.needed_amount, nextAmount)),
        name: existing.name,
        needed_amount: mergeAmounts(existing.needed_amount, nextAmount),
      });
      return;
    }

    grouped.set(normalizedName, {
      buy_amount: estimatePackageAmount(ingredient.name, nextAmount),
      name: safeTrim(ingredient.name),
      needed_amount: nextAmount,
    });
  });

  return Array.from(grouped.values()).map((item) => ({
    category: "Meal Ingredients",
    name: item.name,
    buy_amount: item.buy_amount,
    estimated_price: estimatePackagePrice(item.name, item.buy_amount),
    needed_amount: item.needed_amount,
  }));
}

function estimateRestockPrice(itemName: string) {
  return estimatePackagePrice(itemName, estimatePackageAmount(itemName));
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
  const [isPremiumMode, setIsPremiumMode] = useState(false);
  const [isGroceryOpen, setIsGroceryOpen] = useState(false);
  const [restoredItems, setRestoredItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [newCustomItem, setNewCustomItem] = useState("");

  const { derivedGroceryList, skippedGroceryList } = useMemo(() => {
    const pantry = [...Array.from(fullyStocked), ...Array.from(runningLow)];
    const validPantry = pantry
      .filter((item) => typeof item === "string")
      .map((item) => safeTrim(item).toLowerCase())
      .filter((item) => item.length > 2);

    const allMeals = [...weeklyMenu, ...savedDesserts];
    const rawGroceryList: IngredientItem[] = [];
    const rawSkippedList: IngredientItem[] = [];

    allMeals.forEach((meal) => {
      (meal.ingredients ?? []).forEach((ingredient) => {
        const ingName = normalizeIngredientName(ingredient.name);
        const isForced = restoredItems.includes(ingName);

        const isOwned = validPantry.some((pantryItem) => {
          const singularPantryItem = pantryItem.endsWith("s")
            ? pantryItem.slice(0, -1)
            : pantryItem;

          return ingName.includes(pantryItem) || ingName.includes(singularPantryItem);
        });

        if (!isOwned || isForced) {
          rawGroceryList.push(ingredient);
        } else {
          rawSkippedList.push(ingredient);
        }
      });
    });

    const directGroceryList = aggregateIngredientItems(rawGroceryList);
    const directSkippedList = aggregateIngredientItems(rawSkippedList);

    const restockItems: GroceryListItem[] = Array.from(restock).map((restockItem) => ({
      category: "Restock",
      buy_amount: estimatePackageAmount(restockItem),
      name: safeTrim(restockItem),
      needed_amount: "Restock pantry",
      estimated_price: Math.max(1, estimateRestockPrice(restockItem)),
    }));

    return {
      derivedGroceryList: [...directGroceryList, ...restockItems],
      skippedGroceryList: directSkippedList,
    };
  }, [fullyStocked, restock, restoredItems, runningLow, savedDesserts, weeklyMenu]);

  const displayGroceryList = useMemo(() => {
    if (!isPremiumMode) {
      return derivedGroceryList;
    }

    return derivedGroceryList.map((item) => {
      const lowerName = item.name.toLowerCase();
      let prefix = "Premium ";

      if (
        lowerName.includes("beef") ||
        lowerName.includes("chicken") ||
        lowerName.includes("turkey") ||
        lowerName.includes("pork") ||
        lowerName.includes("eggs")
      ) {
        prefix = "Organic Pasture-Raised ";
      } else if (
        lowerName.includes("milk") ||
        lowerName.includes("cheese") ||
        lowerName.includes("butter")
      ) {
        prefix = "Organic Grass-Fed ";
      } else if (
        lowerName.includes("pasta") ||
        lowerName.includes("rice") ||
        lowerName.includes("bread")
      ) {
        prefix = "Artisanal ";
      } else if (
        lowerName.includes("broccoli") ||
        lowerName.includes("spinach") ||
        lowerName.includes("tomatoes") ||
        lowerName.includes("apples") ||
        lowerName.includes("berries")
      ) {
        prefix = "Local Organic ";
      }

      return {
        ...item,
        name: `${prefix}${item.name}`,
        estimated_price: Number((item.estimated_price * 1.5).toFixed(2)),
      };
    });
  }, [derivedGroceryList, isPremiumMode]);

  const displayGroceriesByCategory = useMemo(() => {
    const grouped = displayGroceryList.reduce<Record<string, GroceryListItem[]>>(
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

    return Object.entries(grouped);
  }, [displayGroceryList]);

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

    return Object.entries(grouped);
  }, [skippedGroceryList]);

  const shoppingListText = useMemo(() => {
    let listText = displayGroceriesByCategory
      .map(([category, items]) =>
        `${category}\n${items
          .map(
            (item) =>
              `- ${item.name}${item.needed_amount ? ` | Need: ${item.needed_amount}` : ""}${item.buy_amount ? ` | Buy: ${item.buy_amount}` : ""} (${formatCurrency(item.estimated_price)})`,
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
    () => displayGroceryList.reduce((sum, item) => sum + item.estimated_price, 0),
    [displayGroceryList],
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
    setIsPremiumMode(false);
    setIsGroceryOpen(false);
    setRestoredItems([]);
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
    isPremiumMode,
    newCustomItem,
    resetGroceryState,
    restoredItems,
    setCustomItemChecked: (id: string, isChecked: boolean) =>
      setCustomItems((current) =>
        current.map((item) => (item.id === id ? { ...item, isChecked } : item)),
      ),
    setGroceryOpen: setIsGroceryOpen,
    setNewCustomItem,
    setPremiumMode: setIsPremiumMode,
    skippedGroceriesByCategory,
    toggleCheckedItem,
    totalCost,
    removeCustomItem: (id: string) =>
      setCustomItems((current) => current.filter((item) => item.id !== id)),
    removeRestoredItem: (name: string) =>
      setRestoredItems((current) =>
        current.filter((currentName) => currentName !== normalizeIngredientName(name)),
      ),
    restoreSkippedItem: (name: string) =>
      setRestoredItems((current) => {
        const normalizedName = normalizeIngredientName(name);
        return current.includes(normalizedName) ? current : [...current, normalizedName];
      }),
  };
}
