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
  imageUrl: z.string().url().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_DESSERT_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80";

async function fetchUnsplashImage(encodedQuery: string) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return DEFAULT_DESSERT_IMAGE;
  }

  const url = `https://api.unsplash.com/search/photos?query=${encodedQuery}&client_id=${process.env.UNSPLASH_ACCESS_KEY}&per_page=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return DEFAULT_DESSERT_IMAGE;
    }

    const data = (await response.json()) as {
      results?: Array<{ urls?: { regular?: string; small?: string } }>;
    };

    if (!data?.results || data.results.length === 0) {
      return DEFAULT_DESSERT_IMAGE;
    }

    const imageUrl =
      data.results[0]?.urls?.regular ?? data.results[0]?.urls?.small;

    return imageUrl || DEFAULT_DESSERT_IMAGE;
  } catch {
    return DEFAULT_DESSERT_IMAGE;
  }
}

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
- Return valid JSON only.
- Use this exact JSON shape:
{
  "title": "string",
  "description": "string"
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
    const dessertQuery = encodeURIComponent(`${parsed.title} dessert`);
    const imageUrl = await fetchUnsplashImage(dessertQuery);
    return NextResponse.json({ ...parsed, imageUrl });
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
