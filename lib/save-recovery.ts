export type WeekDraft<Meal> = {
  userId: string;
  dinners: Meal[];
  desserts: Meal[];
  pantry: string[];
  pantryEntries?:unknown[];
  dirty: boolean;
};

export function weekDraftKey(userId: string) {
  return `mealcaddie-week-draft-v1:${userId}`;
}

export function recoverWeekDraft<Meal>(value: unknown, userId: string): WeekDraft<Meal> | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as WeekDraft<Meal>;
  const validMeal = (meal: unknown) => Boolean(meal && typeof meal === "object" && "name" in meal && typeof meal.name === "string");
  if (draft.userId !== userId || !Array.isArray(draft.dinners) || !Array.isArray(draft.desserts) ||
      !draft.dinners.every(validMeal) || !draft.desserts.every(validMeal) || !Array.isArray(draft.pantry) || !draft.pantry.every((item) => typeof item === "string") || typeof draft.dirty !== "boolean") return null;
  return draft;
}

export function weekSnapshot(dinners: unknown[], desserts: unknown[], pantry: unknown[] | null) {
  return JSON.stringify({ dinners, desserts, pantry: pantry === null ? null : [...pantry].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))) });
}

export function saveErrorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message : "Please check your connection and retry.";
}
