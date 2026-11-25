"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMealRequestHeaders } from "../lib/meal-request-headers";
import { getRecipeSourceKey } from "../lib/recipe-ingredients";
import { normalizeRecipe, normalizeSavedRecipes, recipeStorageKey, rememberRecipe } from "../lib/recipe-progress";
import { loadStoredJson, saveStoredJson } from "../lib/smart-cart-persistence";
import type {PantryEntry} from "../lib/pantry";
import {pantryMealMetadata} from "../lib/pantry-meal-metadata";

type IngredientItem = {
  name: string;
  amount: string;
  price?: number;
};

type MealPlanItem = {
  pantryOnly?:boolean;pantryPlanId?:string;pantryTimeLimit?:number;
  user_id: string;
  day: string;
  name: string;
  servings: number;
  notes: string;
  description?: string;
  dietaryRestrictions?: string;
  ingredients?: IngredientItem[];
  imageUrl?: string;
};

type GeneratedDessert = {
  title: string;
  description: string;
  ingredients: IngredientItem[];
  imageUrl?: string;
};

type RecipeResponse = {
  title: string;
  prep_time_minutes: number;
  ingredients: string[];
  steps: string[];
};

type UseSmartCartRecipeArgs = {
  pantryEntries?:PantryEntry[];pantryReviewRequired?:boolean;mealSourceMode?:string;
  householdSize: number;
  userId: string;
  diet: string;
  avoidIngredients: string;
  availableEquipment: string[];
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function useSmartCartRecipe({ householdSize, userId, diet, avoidIngredients, availableEquipment,pantryEntries=[],pantryReviewRequired=false,mealSourceMode }: UseSmartCartRecipeArgs) {
  const [recipeCache, setRecipeCache] = useState<Record<string, RecipeResponse>>({});
  const recipeSources = useRef<Record<string, string>>({});
  const [activeRecipeMeal, setActiveRecipeMeal] = useState<MealPlanItem | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeLoadingMeal, setRecipeLoadingMeal] = useState<string | null>(null);

  // A recipe generated under different restrictions must not bypass new checks.
  const preferenceKey = JSON.stringify(["food-quality-v2", diet, avoidIngredients, availableEquipment]);
  const sourceFor = useCallback((meal: MealPlanItem) => `${getRecipeSourceKey(meal)}::${preferenceKey}${meal.pantryOnly?JSON.stringify(["pantry-actions-v1",meal.pantryPlanId,meal.pantryTimeLimit,pantryEntries,pantryReviewRequired]):""}`, [preferenceKey,pantryEntries,pantryReviewRequired]);
  const activeRecipe = useMemo(
    () => (activeRecipeMeal && !((activeRecipeMeal.pantryOnly||(activeRecipeMeal.pantryOnly===undefined&&mealSourceMode==="pantry-only"))&&(pantryReviewRequired||!activeRecipeMeal.pantryPlanId||!activeRecipeMeal.pantryTimeLimit)) && recipeSources.current[activeRecipeMeal.name] === sourceFor(activeRecipeMeal)
      ? recipeCache[activeRecipeMeal.name]
      : undefined),
    [activeRecipeMeal, recipeCache, sourceFor,mealSourceMode,pantryReviewRequired],
  );

  async function fetchRecipeForMeal(meal: MealPlanItem) {
    const only=meal.pantryOnly||(meal.pantryOnly===undefined&&mealSourceMode==="pantry-only");
    if(only&&(pantryReviewRequired||!meal.pantryPlanId||!meal.pantryTimeLimit)){setRecipeError("Review this plan's pantry quantities and preparation forms before cooking. Legacy Pantry Only meals need a newly validated plan.");return null;}
    const sourceKey = sourceFor(meal);
    if (recipeCache[meal.name] && recipeSources.current[meal.name] === sourceKey) {
      setRecipeError(null);
      setRecipeLoadingMeal(null);
      return recipeCache[meal.name];
    }

    const storageKey = recipeStorageKey(userId);
    const remembered = normalizeSavedRecipes(loadStoredJson(storageKey)).find(item => item.source === sourceKey);
    if (remembered) {
      setRecipeError(null);
      setRecipeLoadingMeal(null);
      recipeSources.current[meal.name] = sourceKey;
      setRecipeCache(current => ({ ...current, [meal.name]: remembered.recipe }));
      return remembered.recipe;
    }

    const version = ++requestVersion.current;
    setRecipeError(null);
    setRecipeLoadingMeal(meal.name);

    try {
      const response = await fetch("/api/get-recipe", {
        method: "POST",
        headers: await getMealRequestHeaders(userId || undefined),
        body: JSON.stringify({
          mealTitle: meal.name,
          ...(only?{pantryOnly:true,pantryPlanId:meal.pantryPlanId,maximumMinutes:meal.pantryTimeLimit,pantryInventory:pantryEntries}:{}),
          diet, avoidIngredients, availableEquipment,
          mealNotes: meal.description || meal.notes,
          originalDietaryRestrictions: meal.dietaryRestrictions,
          servings: meal.servings,
          ingredients: meal.ingredients?.length ? meal.ingredients : undefined,
        }),
      });

      const data = (await response.json()) as RecipeResponse & { error?: string };
      if (version !== requestVersion.current) return null;

      if (!response.ok) {
        setRecipeError(`Error ${response.status}: ${data.error || "Request failed."}`);
        return null;
      }

      const recipeData = normalizeRecipe({
        title: data.title,
        prep_time_minutes: data.prep_time_minutes,
        ingredients: data.ingredients,
        steps: data.steps,
      });
      if (!recipeData) { setRecipeError("This recipe was incomplete. Please close it and try again."); return null; }

      saveStoredJson(storageKey, rememberRecipe(normalizeSavedRecipes(loadStoredJson(storageKey)), { source: sourceKey, recipe: recipeData, progress: { ingredients: [], steps: [] } }));

      recipeSources.current[meal.name] = sourceKey;
      setRecipeCache((current) => ({
        ...current,
        [meal.name]: recipeData,
      }));

      return recipeData;
    } catch (error) {
      if (version === requestVersion.current) setRecipeError(error instanceof Error ? error.message : "Failed to fetch recipe.");
      return null;
    } finally {
      if (version === requestVersion.current) setRecipeLoadingMeal(null);
    }
  }

  async function handleGetRecipe(meal: MealPlanItem) {
    requestVersion.current += 1;
    setActiveRecipeMeal(meal);
    await fetchRecipeForMeal(meal);
  }

  async function handleGetDessertRecipe(dessert: GeneratedDessert, index: number) {
    const dessertMeal: MealPlanItem = {
      ...pantryMealMetadata(dessert),
      user_id: safeTrim(userId),
      day: `Sweet Treat ${index + 1}`,
      name: dessert.title,
      servings: householdSize || 2,
      notes: dessert.description,
      ingredients: dessert.ingredients,
      imageUrl: dessert.imageUrl,
    };

    await handleGetRecipe(dessertMeal);
  }

  function closeRecipeModal() {
    setActiveRecipeMeal(null);
    setRecipeError(null);
  }

  const requestVersion = useRef(0);
  const resetRecipeState = useCallback(() => {
    requestVersion.current += 1;
    recipeSources.current = {};
    setRecipeCache({});
    setActiveRecipeMeal(null);
    setRecipeError(null);
    setRecipeLoadingMeal(null);
  }, []);

  useEffect(() => { resetRecipeState(); return () => { requestVersion.current += 1; }; }, [userId, preferenceKey, resetRecipeState]);

  return {
    activeRecipe,
    activeRecipeMeal,
    closeRecipeModal,
    handleGetDessertRecipe,
    handleGetRecipe,
    recipeCache,
    recipeError,
    recipeLoadingMeal,
    resetRecipeState,
    setActiveRecipeMeal,
  };
}
