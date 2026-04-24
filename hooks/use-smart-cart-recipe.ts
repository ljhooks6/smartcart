"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [activeRecipeMeal, setActiveRecipeMeal] = useState<MealPlanItem | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeLoadingMeal, setRecipeLoadingMeal] = useState<string | null>(null);
  const [expandedIngredientsMeals, setExpandedIngredientsMeals] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!activeRecipeMeal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveRecipeMeal(null);
        setRecipeError(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRecipeMeal]);

  const activeRecipe = useMemo(
    () => (activeRecipeMeal ? recipeCache[activeRecipeMeal.name] : undefined),
    [activeRecipeMeal, recipeCache],
  );

  async function fetchRecipeForMeal(meal: MealPlanItem) {
    if (recipeCache[meal.name]) {
      return recipeCache[meal.name];
    }

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
        }),
      });

      const data = (await response.json()) as RecipeResponse & { error?: string };

      if (!response.ok) {
        setRecipeError(`Error ${response.status}: ${data.error || "Request failed."}`);
        return null;
      }

      const recipeData = {
        title: data.title,
        prep_time_minutes: data.prep_time_minutes,
        ingredients: data.ingredients,
        steps: data.steps,
      };

      setRecipeCache((current) => ({
        ...current,
        [meal.name]: recipeData,
      }));

      return recipeData;
    } catch (error) {
      setRecipeError(error instanceof Error ? error.message : "Failed to fetch recipe.");
      return null;
    } finally {
      setRecipeLoadingMeal(null);
    }
  }

  async function handleGetRecipe(meal: MealPlanItem) {
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

  async function handleToggleIngredients(meal: MealPlanItem) {
    const mealKey = `${meal.day}::${meal.name}`;

    if (expandedIngredientsMeals.has(mealKey)) {
      setExpandedIngredientsMeals((current) => {
        const next = new Set(current);
        next.delete(mealKey);
        return next;
      });
      return;
    }

    const recipe = await fetchRecipeForMeal(meal);
    if (!recipe) {
      return;
    }

    setExpandedIngredientsMeals((current) => {
      const next = new Set(current);
      next.add(mealKey);
      return next;
    });
  }

  function closeRecipeModal() {
    setActiveRecipeMeal(null);
    setRecipeError(null);
  }

  function resetRecipeState() {
    setRecipeCache({});
    setActiveRecipeMeal(null);
    setRecipeError(null);
    setRecipeLoadingMeal(null);
    setExpandedIngredientsMeals(new Set());
  }

  return {
    activeRecipe,
    activeRecipeMeal,
    closeRecipeModal,
    expandedIngredientsMeals,
    handleGetDessertRecipe,
    handleGetRecipe,
    handleToggleIngredients,
    recipeCache,
    recipeError,
    recipeLoadingMeal,
    resetRecipeState,
    setActiveRecipeMeal,
  };
}
