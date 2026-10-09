import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { formatRecipeIngredients } from "@/lib/recipe-ingredients";

const recipeRequestSchema = z.object({
  mealTitle: z.string().trim().min(1),
  mealNotes: z.string().optional(),
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

  const requestResult = recipeRequestSchema.safeParse(body);
  if (!requestResult.success) {
    return NextResponse.json(
      { error: "Provide a meal title, valid servings, and ingredient names with amounts when supplied." },
      { status: 400 },
    );
  }
  const { mealTitle, mealNotes, servings, ingredients } = requestResult.data;
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
Servings: ${typeof servings === "number" ? servings : "Use a reasonable default"}
Planned ingredients: ${ingredientLines ? JSON.stringify(ingredientLines) : "No stored ingredient list; create a practical recipe."}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
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

    const parsed = recipeResponseSchema.parse(JSON.parse(content));
    return NextResponse.json({
      ...parsed,
      // Preserve the stored plan exactly, even if the model rewrites its list.
      ingredients: ingredientLines ?? parsed.ingredients,
    });
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
