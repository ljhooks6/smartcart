type RecipeIngredient = { name: string; amount: string };

// Replacement responses provide complete ingredient lines. Keep those lines for
// the shared conservative parser; a missing measurement is never "1 pack".
export function replacementIngredientItems(lines:string[]){
  return lines.map(name=>({name:name.trim(),amount:"",price:0}));
}

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
