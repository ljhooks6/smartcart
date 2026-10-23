import { z } from "zod";
import { writeDiet } from "./dietary-safety";

export function accountExperienceEnabled(env: Record<string, string | undefined> = process.env) {
  return env.ACCOUNT_EXPERIENCE_ENABLED === "true" && (env.VERCEL_ENV !== "production" || env.ACCOUNT_EXPERIENCE_RELEASE_APPROVED === "true");
}
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{2,29}$/).refine(value => !["admin", "administrator", "support", "mealcaddie", "beta"].includes(value));
export const credentialSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("login"), identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) }).strict(),
  z.object({ action: z.literal("register"), email: z.string().trim().toLowerCase().email().max(254), username: usernameSchema, password: z.string().min(12).max(128) }).strict(),
  z.object({ action: z.literal("recover"), email: z.string().trim().toLowerCase().email().max(254) }).strict(),
]);
export const cookingEquipment = ["Oven", "Stovetop", "Microwave", "Grill", "Air Fryer", "Slow Cooker", "Blender"] as const;
export const householdPreferences = z.object({
  householdSize: z.number().int().min(1).max(12).nullable().default(null),
  diet: z.enum(["No preference", "Vegetarian", "Vegan", "Pescatarian"]).default("No preference"),
  dislikes: z.string().trim().max(300).default(""),
  restrictions: z.string().trim().max(300).default(""),
  prepTime: z.enum(["Under 30 mins", "Under 1 hour", "No limit"]).default("Under 30 mins"),
  availableEquipment: z.array(z.enum(cookingEquipment)).max(7).transform(values => [...new Set(values)]).default([]),
  budget: z.number().min(1).max(10000).nullable().default(null),
  step: z.number().int().min(0).max(2).default(0),
  complete: z.boolean().default(false),
}).strict();
export type HouseholdPreferences = z.infer<typeof householdPreferences>;
export const emptyHousehold = (): HouseholdPreferences => householdPreferences.parse({});
export function readHousehold(metadata: Record<string, unknown> | undefined) {
  const parsed = householdPreferences.safeParse(metadata?.mealcaddie_household_v1);
  return parsed.success ? parsed.data : emptyHousehold();
}
export function householdPlanDefaults(preferences: HouseholdPreferences) {
  return {
    householdSize: preferences.householdSize === null ? "" : String(preferences.householdSize),
    budget: preferences.budget === null ? "" : String(preferences.budget),
    diet: preferences.restrictions ? writeDiet(preferences.diet, { allergies: [], preferences: [], customAllergies: preferences.restrictions, intolerances: "", medical: "" }) : preferences.diet,
    avoidIngredients: preferences.dislikes, prepTime: preferences.prepTime,
    availableEquipment: preferences.availableEquipment,
  };
}
