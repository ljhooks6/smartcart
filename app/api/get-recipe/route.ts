import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

type GetRecipeRequest = {
  mealTitle: string;
  mealNotes?: string;
  servings?: number;
};

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

  const { mealTitle, mealNotes, servings } =
    (body as Partial<GetRecipeRequest>) ?? {};

  if (typeof mealTitle !== "string" || mealTitle.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing required field: mealTitle" },
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
You are a precise weeknight recipe writer.
Create a fast, easy, appetizing recipe for a single dinner from a meal plan.

Rules:
- Return valid JSON only.
- Keep the recipe practical for home cooks.
- Include one realistic prep time in minutes.
- Include a concise ingredient list.
- Include clear, step-by-step instructions.
- Keep the recipe aligned with the given meal title and notes.
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
