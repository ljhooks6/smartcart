import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

type ReplaceMealRequest = {
  budget: number;
  diet: string;
  householdSize: number;
  combinedPantryItems: string;
  rejectedMealTitle: string;
  prepTime?: string;
  adventureLevel?: string;
  mustHaveIngredient?: string;
  existingMeals?: string;
};

const replaceMealResponseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  prepTime: z.number().int().positive(),
  ingredients: z.array(z.string().min(1)).min(1),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

  const {
    budget,
    diet,
    householdSize,
    combinedPantryItems,
    rejectedMealTitle,
    prepTime,
    adventureLevel,
    mustHaveIngredient,
    existingMeals,
  } = (body as Partial<ReplaceMealRequest>) ?? {};

  if (
    typeof budget !== "number" ||
    typeof diet !== "string" ||
    typeof householdSize !== "number" ||
    typeof combinedPantryItems !== "string" ||
    typeof rejectedMealTitle !== "string"
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: budget, diet, householdSize, combinedPantryItems, rejectedMealTitle",
      },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing." },
      { status: 500 },
    );
  }

  const systemPrompt = `
You are an expert budget-conscious meal planner helping replace a single rejected dinner.

Rules:
- Generate exactly ONE replacement meal.
- The replacement must feel clearly different from the rejected meal title in flavor profile, format, and primary ingredients.
- CRITICAL: Do NOT suggest, generate, or return any of the following meals: ${existingMeals?.trim() || "None provided"}.
- Respect the user's budget, diet, household size, pantry items, and prep-time preference.
- Use pantry items where reasonable.
- Keep the replacement practical for a weeknight home cook.
- Return valid JSON only.
- Use this exact JSON shape:
{
  "title": "string",
  "description": "string",
  "prepTime": number,
  "ingredients": ["string"]
}
`;

  const userPrompt = `
Generate one replacement meal with these constraints:

Budget: ${budget}
Diet: ${diet}
Household Size: ${householdSize}
Pantry Items: ${combinedPantryItems || "None provided"}
Rejected Meal Title: ${rejectedMealTitle}
Prep Time Preference: ${prepTime || "No preference provided"}
Adventure Level: ${adventureLevel || "No preference provided"}
Must-Have Ingredient: ${mustHaveIngredient?.trim() || "None provided"}

The new meal must be distinctly different from "${rejectedMealTitle}".
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 500 },
      );
    }

    const parsed = replaceMealResponseSchema.parse(JSON.parse(content));
    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: `Schema validation failed: ${error.issues
            .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
            .join("; ")}`,
        },
        { status: 500 },
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
