type DescribedMeal = { description?: string; notes?: string };
export function usableDescription(text?: string) {
  const value = text?.trim() || "";
  if (value.length < 25 || /Ingredients:|Approx\.? prep time:/i.test(value) || /(?:^|[.!?]\s+)(?:step\s*\d|coat|cook|heat|preheat|bake|roast|mix|stir|add|chop|dice|simmer|boil|whisk|combine|serve|place|transfer|drain|toss)\b/i.test(value)) return "";
  return value;
}
export function recipeDescription(meal: DescribedMeal) {
  return usableDescription(meal.description) || usableDescription(meal.notes) || "A finished-dish description wasn’t saved for this recipe. Open it in Cook or Vault for ingredients and cooking steps.";
}
