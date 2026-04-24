import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

type ReplaceDessertRequest = {
  rejectedDessertTitle: string;
  budget: number;
  diet?: string;
  householdSize?: number;
  combinedPantryItems?: string;
};

const replaceDessertResponseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        amount: z.string().min(1),
        price: z.number().min(0.01),
      }),
    )
    .min(1),
  imageUrl: z.string().url().optional(),
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
    rejectedDessertTitle,
    budget,
    diet,
    householdSize,
    combinedPantryItems,
  } = (body as Partial<ReplaceDessertRequest>) ?? {};

  if (
    typeof rejectedDessertTitle !== "string" ||
    rejectedDessertTitle.trim().length === 0 ||
    typeof budget !== "number"
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: rejectedDessertTitle, budget",
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
You are a creative dessert planner helping replace one rejected dessert.

Rules:
- Generate exactly ONE dessert.
- It must feel different from the rejected dessert title.
- Keep it practical, appealing, and budget-conscious.
- Prefer pantry-friendly desserts when possible.
- The replacement should change dessert category or flavor lane when possible. For example, if the rejected dessert sounds like a cookie, brownie, or bar, try a pie, cobbler, pudding, crisp, cheesecake, or cake instead.
- Avoid repeating the same dominant flavor word from the rejected dessert title unless the pantry strongly forces it.
- Include a localized "ingredients" array using this exact shape for each item: { "name": "string", "amount": "string", "price": number }.
- Return valid JSON only.
- Use this exact JSON shape:
{
  "title": "string",
  "description": "string",
  "ingredients": [
    {
      "name": "string",
      "amount": "string",
      "price": number
    }
  ]
}
`;

  const userPrompt = `
Generate one replacement dessert with these constraints:

Rejected Dessert Title: ${rejectedDessertTitle}
Budget: ${budget}
Diet: ${diet?.trim() || "No specific diet provided"}
Household Size: ${typeof householdSize === "number" ? householdSize : "Not provided"}
Pantry Items: ${combinedPantryItems?.trim() || "None provided"}

The new dessert must be clearly different from "${rejectedDessertTitle}".
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

    const parsed = replaceDessertResponseSchema.parse(JSON.parse(content));
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
