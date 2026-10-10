"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRecipeSourceKey } from "../lib/recipe-ingredients";
import { normalizeRecipe, normalizeSavedRecipes, recipeStorageKey, rememberRecipe } from "../lib/recipe-progress";
import { loadStoredJson, saveStoredJson } from "../lib/smart-cart-persistence";

type IngredientItem = {
  name: string;
  amount: string;
  price?: number;
};

type MealPlanItem = {
  user_id: string;
  day: string;
  name: string;
  servings: number;
  notes: string;
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
  householdSize: number;
  userId: string;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function useSmartCartRecipe({ householdSize, userId }: UseSmartCartRecipeArgs) {
  const [recipeCache, setRecipeCache] = useState<Record<string, RecipeResponse>>({});
  const recipeSources = useRef<Record<string, string>>({});
  const [activeRecipeMeal, setActiveRecipeMeal] = useState<MealPlanItem | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeLoadingMeal, setRecipeLoadingMeal] = useState<string | null>(null);

  const activeRecipe = useMemo(
    () => (activeRecipeMeal && recipeSources.current[activeRecipeMeal.name] === getRecipeSourceKey(activeRecipeMeal)
      ? recipeCache[activeRecipeMeal.name]
      : undefined),
    [activeRecipeMeal, recipeCache],
  );

  async function fetchRecipeForMeal(meal: MealPlanItem) {
    const sourceKey = getRecipeSourceKey(meal);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mealTitle: meal.name,
          mealNotes: meal.notes,
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

  useEffect(() => { resetRecipeState(); return () => { requestVersion.current += 1; }; }, [userId, resetRecipeState]);

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
