"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { deriveGroceryLists, getIngredientKey, sortGroceryGroups, type GroceryListItem } from "../lib/grocery-list";

import { emptyShoppingState, parseShoppingProgress, shoppingReducer } from "../lib/shopping-progress";
import type {PantryEntry} from "../lib/pantry";

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
  pantryEntries?:PantryEntry[];
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
  pantryEntries,
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
  const ownedShopping=loadedStorageKey===storageKey?shopping:emptyShoppingState();
  const restoredItems = ownedShopping.restored;
  const removedGroceryItems = ownedShopping.removed;
  const customItems = ownedShopping.custom;
  const [copied, setCopied] = useState(false);
  const [isGroceryOpen, setIsGroceryOpen] = useState(false);
  const [newCustomItem, setNewCustomItem] = useState("");

  const complete = useMemo(() => deriveGroceryLists({
    fullyStocked, runningLow, restock, weeklyMenu, savedDesserts, pantryItems,pantryEntries, restoredItems,
  }), [
    fullyStocked,
    pantryItems,
    pantryEntries,
    restock,
    restoredItems,
    runningLow,
    savedDesserts,
    weeklyMenu,
  ]);
  const requirementFingerprints=Object.fromEntries([...complete.derivedGroceryList,...complete.skippedGroceryList].map(i=>[i.item_key,JSON.stringify([i.requirement_key,i.shortage_amount])]));
  const checkedItems=new Set(ownedShopping.checked.filter(key=>!ownedShopping.fingerprints?.[key]||ownedShopping.fingerprints[key]===requirementFingerprints[key]));
  const requirementContext=JSON.stringify(requirementFingerprints);
  useEffect(()=>{if(loadedStorageKey===storageKey)dispatchShopping({type:"reconcile",requirements:JSON.parse(requirementContext)});},[requirementContext,loadedStorageKey,storageKey]);
  const derivedGroceryList=complete.derivedGroceryList.filter(i=>!removedGroceryItems.includes(i.item_key)||(ownedShopping.fingerprints?.[i.item_key]&&ownedShopping.fingerprints[i.item_key]!==requirementFingerprints[i.item_key]));
  const skippedGroceryList=complete.skippedGroceryList;

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
              `- ${item.name}${item.needed_amount ? ` | Recipes use: ${item.needed_amount}` : ""}${item.shortage_amount ? ` | Still need: ${item.shortage_amount}` : ""}${item.buy_amount ? ` | Buy: ${item.buy_amount}` : ""}${item.meal_names?.length ? ` | For: ${item.meal_names.join(", ")}` : ""}${item.pantry_note?` | ${item.pantry_note}`:""} (${item.price_status==="unavailable"?"Estimate unavailable":formatCurrency(item.estimated_price)})`,
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
    undoMessage: ownedShopping.undo?.message ?? null,
    undoLastGroceryAction: () => dispatchShopping({ type: "undo" }),
    setGroceryOpen: setIsGroceryOpen,
    setNewCustomItem,
    skippedGroceriesByCategory,
    toggleCheckedItem,
    totalCost,
    hasUnknownPrices:derivedGroceryList.some(i=>i.price_status==="unavailable"),
    pantryRequirements:complete.pantryRequirements,
    removeCustomItem: (id: string) => dispatchShopping({ type: "custom-remove", id }),
    removeGroceryItem: (itemKey: string) => dispatchShopping({ type: "remove", key: itemKey, name: derivedGroceryList.find(item => item.item_key === itemKey)?.name || "Item" }),
    removeRestoredItem: (name: string) => dispatchShopping({ type: "unrestore", key: getIngredientKey(name), name }),
    restoreSkippedItem: (name: string) => dispatchShopping({ type: "restore", key: getIngredientKey(name), name }),
  };
}
