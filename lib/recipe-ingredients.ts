type RecipeIngredient = { name: string; amount: string };

type RecipeSource = {
  name: string;
  notes?: string;
  servings?: number;
  ingredients?: RecipeIngredient[];
};

export function formatRecipeIngredients(ingredients: RecipeIngredient[]) {
  return ingredients.map(({ name, amount }) => `${amount.trim()} ${name.trim()}`.trim());
}

// A title alone cannot identify a recipe after quantities or servings change.
export function getRecipeSourceKey(meal: RecipeSource) {
  return JSON.stringify([
    meal.name,
    meal.notes ?? "",
    meal.servings,
    meal.ingredients?.map(({ name, amount }) => [name.trim(), amount.trim()]) ?? [],
  ]);
}
