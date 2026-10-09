"use client";

import { useMemo, useState } from "react";
import { deriveGroceryLists, getIngredientKey, sortGroceryGroups, type GroceryListItem } from "../lib/grocery-list";

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

type CustomItem = {
  id: string;
  name: string;
  isChecked: boolean;
};

type UseSmartCartGroceryArgs = {
  formatCurrency: (value: number) => string;
  fullyStocked: Set<string>;
  onCopyError: (message: string) => void;
  pantryItems: string[];
  restock: Set<string>;
  runningLow: Set<string>;
  savedDesserts: MealPlanItem[];
  weeklyMenu: MealPlanItem[];
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function useSmartCartGrocery({
  formatCurrency,
  fullyStocked,
  onCopyError,
  pantryItems,
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

  const { derivedGroceryList, skippedGroceryList } = useMemo(() => deriveGroceryLists({
    fullyStocked, runningLow, restock, weeklyMenu, savedDesserts, pantryItems, restoredItems, removedGroceryItems,
  }), [
    fullyStocked,
    pantryItems,
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
              `- ${item.name}${item.needed_amount ? ` | Need: ${item.needed_amount}` : ""}${item.buy_amount ? ` | Buy: ${item.buy_amount}` : ""}${item.meal_names?.length ? ` | For: ${item.meal_names.join(", ")}` : ""}${item.usage_notes?.length ? ` | How used: ${item.usage_notes.map((note) => `${note.meal}: ${note.usage}`).join(" ")}` : ""} (${formatCurrency(item.estimated_price)})`,
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
          (currentName) => currentName !== getIngredientKey(name),
        ),
      ),
    restoreSkippedItem: (name: string) =>
      setRestoredItems((current) => {
        const normalizedName = getIngredientKey(name);
        return current.includes(normalizedName) ? current : [...current, normalizedName];
      }),
  };
}
