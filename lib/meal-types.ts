export type MealKind = "breakfast" | "lunch" | "dinner" | "sweet_treat";
type TypedMeal = { day?: string; mealType?: string };

export function getMealKind(meal: TypedMeal): MealKind {
  const label = (meal.mealType || meal.day || "").trim().toLowerCase();
  if (label.startsWith("breakfast")) return "breakfast";
  if (label.startsWith("lunch")) return "lunch";
  if (label.startsWith("sweet") || label.startsWith("dessert")) return "sweet_treat";
  return "dinner";
}

export function mealKindLabel(kind: MealKind) {
  return kind === "sweet_treat" ? "Sweet Treat" : kind[0].toUpperCase() + kind.slice(1);
}

export function hasRoomForMeal(meals: TypedMeal[], meal: TypedMeal) {
  const kind = getMealKind(meal);
  return kind === "sweet_treat" || meals.filter((item) => getMealKind(item) === kind).length < 5;
}

export function normalizeOptionalMeals<T extends { day: string; servings?: number }>(meals: T[], kind: "breakfast" | "lunch", householdSize: number) {
  return meals.map((meal, index) => ({ ...meal, day: `${mealKindLabel(kind)} ${index + 1}`, servings: householdSize }));
}
