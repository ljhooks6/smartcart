import { z } from "zod";

const text = z.string().max(4000);
const items = z.array(z.string().max(150)).max(100);
export const generationRequestSchema = z.object({
  budget: z.number().finite().positive().max(10000),
  diet: z.string().min(1).max(6000), householdSize: z.number().int().min(1).max(30),
  combinedPantryItems: text,
  fullyStocked: items.optional(), runningLow: items.optional(), restock: items.optional(),
  mustHaveIngredient: text.optional(), avoidIngredients: text.optional(),
  includeDessert: z.boolean().optional(), includeBreakfast: z.boolean().optional(), includeLunch: z.boolean().optional(),
  adventureLevel: z.string().max(200).optional(), cuisinePreference: z.string().max(200).optional(),
  apply_upgrades: z.boolean().optional(), existingMeals: text.optional(),
  recentRejectedMeals: z.array(z.string().min(1).max(180)).max(12).optional(),
  availableEquipment: z.array(z.string().max(100)).max(20).default(["Oven", "Stovetop", "Microwave"]),
  prepTime: z.string().max(200).optional(), mealSourceMode: z.enum(["pantry-and-store", "pantry-only"]).optional(),
});
export type GenerationInput = z.infer<typeof generationRequestSchema>;

export type GenerationJob = {
  id: string; status: "queued" | "running" | "completed" | "failed";
  created_at: string; updated_at: string; input: GenerationInput;
  result: unknown | null; error: string | null;
};
export function generationLimits(plan: "guest" | "free" | "plus") {
  return { limit: plan === "plus" ? 20 : plan === "free" ? 5 : 3, seconds: plan === "guest" ? 86400 : 604800 };
}
