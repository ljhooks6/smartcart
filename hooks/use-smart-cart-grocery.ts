"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { deriveGroceryLists, getIngredientKey, sortGroceryGroups, type GroceryListItem } from "../lib/grocery-list";

import { emptyShoppingState, parseShoppingProgress, shoppingReducer } from "../lib/shopping-progress";

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

type UseSmartCartGroceryArgs = {
  userId: string;
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
  userId,
  formatCurrency,
  fullyStocked,
  onCopyError,
  pantryItems,
  restock,
  runningLow,
  savedDesserts,
  weeklyMenu,
}: UseSmartCartGroceryArgs) {
  const [shopping, dispatchShopping] = useReducer(shoppingReducer, undefined, emptyShoppingState);
  const storageKey = `mealcaddie-shopping-v1-${userId || "guest"}`;
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  useEffect(() => {
    let stored: unknown = null;
    try { stored = JSON.parse(window.localStorage.getItem(storageKey) || "null"); } catch { /* Shopping still works when storage is unavailable. */ }
    dispatchShopping({ type: "load", progress: parseShoppingProgress(stored) });
    setLoadedStorageKey(storageKey);
  }, [storageKey]);
  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    const { undo: _undo, ...progress } = shopping;
    try { window.localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* Keep this visit usable. */ }
  }, [shopping, loadedStorageKey, storageKey]);
  const checkedItems = useMemo(() => new Set(shopping.checked), [shopping.checked]);
  const restoredItems = shopping.restored;
  const removedGroceryItems = shopping.removed;
  const customItems = shopping.custom;
  const [copied, setCopied] = useState(false);
  const [isGroceryOpen, setIsGroceryOpen] = useState(false);
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
    dispatchShopping({ type: "check", key: itemKey, name: derivedGroceryList.find(item => item.item_key === itemKey)?.name || "Item" });
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

    dispatchShopping({ type: "custom-add", item: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: safeTrim(newCustomItem), isChecked: false,
    } });
    setNewCustomItem("");
  }

  function resetGroceryState() {
    dispatchShopping({ type: "reset" });
    setCopied(false);
    setIsGroceryOpen(false);
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
    setCustomItemChecked: (id: string, isChecked: boolean) => dispatchShopping({ type: "custom-check", id, checked: isChecked }),
    undoMessage: shopping.undo?.message ?? null,
    undoLastGroceryAction: () => dispatchShopping({ type: "undo" }),
    setGroceryOpen: setIsGroceryOpen,
    setNewCustomItem,
    skippedGroceriesByCategory,
    toggleCheckedItem,
    totalCost,
    removeCustomItem: (id: string) => dispatchShopping({ type: "custom-remove", id }),
    removeGroceryItem: (itemKey: string) => dispatchShopping({ type: "remove", key: itemKey, name: derivedGroceryList.find(item => item.item_key === itemKey)?.name || "Item" }),
    removeRestoredItem: (name: string) => dispatchShopping({ type: "unrestore", key: getIngredientKey(name), name }),
    restoreSkippedItem: (name: string) => dispatchShopping({ type: "restore", key: getIngredientKey(name), name }),
  };
}
