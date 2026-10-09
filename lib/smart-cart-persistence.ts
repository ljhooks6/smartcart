import { supabase } from "./supabase";

export const SMART_CART_FORM_STORAGE_KEY = "smartcart-smart-context-form";
export const SMART_CART_WEEKLY_MENU_STORAGE_KEY = "smartcart-weekly-menu";
export const SMART_CART_SAVED_DESSERTS_STORAGE_KEY = "smartcart-saved-desserts";
export const SMART_CART_GENERATED_PLAN_STORAGE_KEY = "smartcart-generated-plan";
export const SMART_CART_ACTION_GUIDANCE_STORAGE_KEY = "smartcart-action-guidance";

type PantryInventoryRow = {
  ingredient_name?: string | null;
  is_owned?: boolean | null;
};

export type SmartCartSavedMealRow = {
  id?: number | string | null;
  meal_title?: string | null;
  recipe_data?: unknown;
  type?: string | null;
  status?: string | null;
  user_id?: string | null;
  name?: string | null;
  ingredients?: unknown[] | null;
  instructions?: unknown[] | null;
};

export type SmartCartArchivedMealRow = {
  id?: number | string | null;
  user_id?: string | null;
  name?: string | null;
  price?: number | string | null;
  ingredients?: unknown[] | null;
  instructions?: unknown[] | null;
  recipe_data?: unknown;
  type?: string | null;
};

export function loadStoredJson<T>(storageKey: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    try { window.localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
    return null;
  }
}

export function saveStoredJson(storageKey: string, value: unknown) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredJson(...storageKeys: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  storageKeys.forEach((storageKey) => {
    try { window.localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
  });
}

export async function fetchOwnedPantryItems(userId: string) {
  if (!userId) {
    return [] as string[];
  }

  const { data, error } = await supabase
    .from("pantry_inventory")
    .select("ingredient_name, is_owned")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((item: PantryInventoryRow) => item.is_owned)
    .map((item: PantryInventoryRow) => item.ingredient_name)
    .filter((ingredientName): ingredientName is string => typeof ingredientName === "string");
}

export async function fetchSavedMealRows(userId: string) {
  if (!userId) {
    return [] as SmartCartSavedMealRow[];
  }

  const { data, error } = await supabase
    .from("weekly_menus")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active_week");

  if (error) {
    throw error;
  }

  return (data ?? []) as SmartCartSavedMealRow[];
}

export async function fetchArchivedMealRows(userId: string) {
  if (!userId) {
    return [] as SmartCartArchivedMealRow[];
  }

  const { data, error } = await supabase
    .from("archived_meals")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []) as SmartCartArchivedMealRow[];
}

export async function saveWeekToCloud(
  userId: string,
  weeklyMenuRows: Array<Record<string, unknown>>,
  pantryItems: string[] | null,
) {
  if (!userId) {
    return;
  }

  const { error } = await supabase.rpc("save_mealcaddie_week", {
    meals: weeklyMenuRows,
    pantry: pantryItems,
  });
  if (error) throw error;
}
