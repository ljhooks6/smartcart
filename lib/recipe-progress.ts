export type Recipe = { title: string; prep_time_minutes: number; ingredients: string[]; steps: string[] };
export type RecipeProgress = { ingredients: number[]; steps: number[] };
export type SavedRecipe = { source: string; recipe: Recipe; progress: RecipeProgress };

export function recipeStorageKey(userId: string) { return `mealcaddie-recipe-progress-v1:${userId || "guest"}`; }

export function normalizeRecipe(value: unknown): Recipe | null {
  if (!value || typeof value !== "object") return null;
  const recipe = value as Recipe;
  const strings = (items: unknown): items is string[] => Array.isArray(items) && items.length > 0 && items.every(item => typeof item === "string" && item.trim().length > 0);
  return typeof recipe.title === "string" && Number.isFinite(recipe.prep_time_minutes) && recipe.prep_time_minutes >= 0 && strings(recipe.ingredients) && strings(recipe.steps) ? recipe : null;
}

export function normalizeProgress(value: unknown, recipe: Recipe): RecipeProgress {
  const progress = value as Partial<RecipeProgress> | null;
  const indexes = (items: unknown, count: number) => Array.isArray(items) ? [...new Set(items.filter((item): item is number => Number.isInteger(item) && item >= 0 && item < count))] : [];
  return { ingredients: indexes(progress?.ingredients, recipe.ingredients.length), steps: indexes(progress?.steps, recipe.steps.length) };
}

export function normalizeSavedRecipes(value: unknown): SavedRecipe[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const recipe = normalizeRecipe(item?.recipe);
    return recipe && typeof item.source === "string" ? [{ source: item.source, recipe, progress: normalizeProgress(item.progress, recipe) }] : [];
  }).slice(-20);
}

export function rememberRecipe(records: SavedRecipe[], record: SavedRecipe): SavedRecipe[] {
  return [...records.filter(item => item.source !== record.source), record].slice(-20);
}

export function toggleProgressIndex(indexes: number[], index: number): number[] {
  return indexes.includes(index) ? indexes.filter(item => item !== index) : [...indexes, index];
}
