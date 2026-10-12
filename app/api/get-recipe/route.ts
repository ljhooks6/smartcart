import { allergySafetyResponse } from "@/lib/allergy-safety";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { formatRecipeIngredients } from "@/lib/recipe-ingredients";
import { getRequestMembership } from "@/lib/server-membership";
import { ingredientViolations, recipeViolations } from "@/lib/ai-food-constraints";
import { generateValidatedFood } from "@/lib/validated-food-generation";

export const maxDuration = 150;

const recipeRequestSchema = z.object({
  mealTitle: z.string().trim().min(1),
  mealNotes: z.string().max(10000).optional(),
  diet: z.string().max(1000).optional(),
  avoidIngredients: z.string().max(2000).optional(),
  availableEquipment: z.array(z.string().max(100)).max(20).optional(),
  servings: z.number().int().positive().optional(),
  ingredients: z.array(z.object({
    name: z.string().trim().min(1),
    amount: z.string().trim().min(1),
  })).min(1).max(200).optional(),
});

const recipeResponseSchema = z.object({
  title: z.string().min(1),
  prep_time_minutes: z.number().int().positive(),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(3),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 60000,
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const requestResult = recipeRequestSchema.safeParse(body);
  if (!requestResult.success) {
    return NextResponse.json(
      { error: "Provide a meal title, valid servings, and ingredient names with amounts when supplied." },
      { status: 400 },
    );
  }
  const { mealTitle, mealNotes, servings, ingredients, diet, avoidIngredients, availableEquipment } = requestResult.data;
  const membership = await getRequestMembership(request);
  if ("status" in membership) return NextResponse.json({ error: membership.error }, { status: membership.status });
  const safetyResponse = allergySafetyResponse({ diet, avoidIngredients }, true); if (safetyResponse) return safetyResponse;
  const preferences = { diet, avoidIngredients, availableEquipment };
  if (ingredients && ingredientViolations(ingredients.map(i => i.name), preferences).length) return NextResponse.json({ error: "This saved meal conflicts with your current dietary preferences. Replace the meal or update your preferences first." }, { status: 422 });
  const ingredientLines = ingredients ? formatRecipeIngredients(ingredients) : undefined;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing." },
      { status: 500 },
    );
  }

  const systemPrompt = `
You are a precise weeknight recipe writer.
Create a fast, easy, appetizing recipe for a single dinner from a meal plan.

Rules:
- Return valid JSON only.
- Keep the recipe practical for home cooks.
- Include one realistic prep time in minutes.
- Include a concise ingredient list.
- Include clear, step-by-step instructions.
- Obey the diet, ingredient exclusions, and available equipment. Do not offer alternatives needing unavailable appliances.
- For raw chicken or turkey, include an internal thermometer check of 165°F/74°C; color alone is not a doneness check.
- Keep the recipe aligned with the given meal title and notes.
- When planned ingredients are provided, they are the complete source of truth for the recipe. Use their exact names, types, and quantities, including every planned side. Do not add ingredients, substitute varieties, or change quantities. Only water may be used without an ingredient entry. Write steps using this same list.
- Do not suggest optional garnishes or extra amounts beyond the planned list. If garnishing, reserve part of the listed amount and explain that in the steps.
- Use this exact JSON shape:
{
  "title": "string",
  "prep_time_minutes": number,
  "ingredients": ["string"],
  "steps": ["string"]
}
`;

  const userPrompt = `
Meal title: ${mealTitle}
Meal notes: ${mealNotes?.trim() || "None provided"}
Diet: ${diet || "No preference"}
Excluded ingredients: ${avoidIngredients || "None"}
Available equipment: ${availableEquipment?.join(", ") ?? "Oven, Stovetop, Microwave"}
Servings: ${typeof servings === "number" ? servings : "Use a reasonable default"}
Planned ingredients: ${ingredientLines ? JSON.stringify(ingredientLines) : "No stored ingredient list; create a practical recipe."}
`;

  try {
    const parsed = await generateValidatedFood(openai, {
      model: membership.plan === "plus" ? "gpt-6.1-sol" : "gpt-6-luna",
      system: systemPrompt.trim(), user: userPrompt.trim(),
      parse: value => recipeResponseSchema.parse(value),
      validate: value => recipeViolations(value, ingredients, preferences),
    });
    return NextResponse.json({
      ...parsed,
      // Preserve the stored plan exactly, even if the model rewrites its list.
      ingredients: ingredientLines ?? parsed.ingredients,
    });
  } catch {
    return NextResponse.json({ error: "We couldn't create a recipe that meets your preferences. Please try again." }, { status: 502 });
  }
}
