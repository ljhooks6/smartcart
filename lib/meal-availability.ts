export const optionalMealPauseMessage = "Breakfast and lunch planning are planned for a future update. Plan dinners and desserts now; your existing breakfast and lunch recipes remain available.";
export function optionalMealRequestPaused(value: unknown) { if (!value || typeof value !== "object")
    return false; const v = value as Record<string, unknown>; return v.includeBreakfast === true || v.includeLunch === true || typeof v.mealType === "string" && /^(breakfast|lunch)$/i.test(v.mealType.trim()); }
export function optionalMealPauseResponse(value: unknown) { return optionalMealRequestPaused(value) ? Response.json({ error: optionalMealPauseMessage, code: "MEAL_TYPE_PAUSED" }, { status: 422, headers: { "Cache-Control": "private, no-store" } }) : null; }
