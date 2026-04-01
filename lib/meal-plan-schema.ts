import { z } from "zod";

export const prepTimeOptions = [
  "Under 30 mins",
  "Under 1 hour",
  "No limit",
] as const;

export const adventureLevelOptions = [
  "Stick to basics",
  "Mix it up",
  "Try new cuisines",
] as const;

export const mealPlanRequestSchema = z.object({
  weeklyBudget: z.number().positive(),
  householdSize: z.number().int().positive(),
  dietaryRestrictions: z.string().trim(),
  prepTimeAvailable: z.enum(prepTimeOptions),
  adventureLevel: z.enum(adventureLevelOptions),
  pantryCheck: z.string().trim().min(3),
  strictStretchMode: z.boolean(),
});

const mealPlanItemSchema = z
  .object({
    day: z.string().min(1),
    meal_name: z.string().min(1),
    prep_time_minutes: z.number().nonnegative(),
    quick_instructions: z.string().min(1),
  })
  .strict();

const groceryCategorySchema = z.array(z.string().min(1));

export const mealPlanResponseSchema = z
  .object({
    meal_plan: z.array(mealPlanItemSchema).length(5),
    grocery_list: z
      .object({
        produce: groceryCategorySchema,
        meat_and_dairy: groceryCategorySchema,
        pantry_staples: groceryCategorySchema,
      })
      .strict(),
    estimated_total_cost: z.number().nonnegative(),
    savings_tip: z.string().min(1),
  })
  .strict();

export type MealPlanRequest = z.infer<typeof mealPlanRequestSchema>;
export type MealPlanResponse = z.infer<typeof mealPlanResponseSchema>;
