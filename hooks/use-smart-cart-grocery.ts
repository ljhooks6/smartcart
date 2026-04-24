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
  amount?: string;
  estimated_price: number;
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

function estimateRestockPrice(itemName: string) {
  const normalized = safeTrim(itemName).toLowerCase();
  let estimate = 3;

  if (
    normalized.includes("steak") ||
    normalized.includes("salmon") ||
    normalized.includes("shrimp") ||
    normalized.includes("seafood")
  ) {
    estimate = 10;
  } else if (
    normalized.includes("chicken") ||
    normalized.includes("pork") ||
    normalized.includes("beef") ||
    normalized.includes("cheese")
  ) {
    estimate = 6;
  } else if (
    normalized.includes("oil") ||
    normalized.includes("sauce") ||
    normalized.includes("butter") ||
    normalized.includes("milk")
  ) {
    estimate = 4;
  } else if (
    normalized.includes("rice") ||
    normalized.includes("pasta") ||
    normalized.includes("beans") ||
    normalized.includes("carrots") ||
    normalized.includes("produce") ||
    normalized.includes("potatoes")
  ) {
    estimate = 2;
  }

  return Math.max(1, estimate);
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
        const ingName = safeTrim(ingredient.name).toLowerCase();
        const isForced = restoredItems.includes(ingredient.name);

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

    const directGroceryList: GroceryListItem[] = rawGroceryList.map((ingredient) => ({
      category: "Meal Ingredients",
      name: safeTrim(ingredient.name),
      amount: safeTrim(ingredient.amount),
      estimated_price: Math.max(1, Number(ingredient.price ?? 0)),
    }));

    const directSkippedList: GroceryListItem[] = rawSkippedList.map((ingredient) => ({
      category: "Meal Ingredients",
      name: safeTrim(ingredient.name),
      amount: safeTrim(ingredient.amount),
      estimated_price: Math.max(1, Number(ingredient.price ?? 0)),
    }));

    const restockItems: GroceryListItem[] = Array.from(restock).map((restockItem) => ({
      category: "Restock",
      name: safeTrim(restockItem),
      amount: "1",
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
          .map((item) => `- ${item.amount ? `${item.amount} ` : ""}${item.name} (${formatCurrency(item.estimated_price)})`)
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
        current.filter((currentName) => currentName !== name),
      ),
    restoreSkippedItem: (name: string) =>
      setRestoredItems((current) => (current.includes(name) ? current : [...current, name])),
  };
}
