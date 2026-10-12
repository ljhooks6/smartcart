import { requireAgreements } from "@/lib/legal-agreements";
import { assessDiet } from "@/lib/dietary-safety";
import OpenAI from "openai";
import { pilotAIBudget, pilotAIBudgetEnabled } from "@/lib/beta-pilot-ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  diet: z.string().max(6000).optional(),
  ingredients: z.array(z.string().min(1)).min(1),
});

const responseSchema = z.array(
  z.object({
    name: z.string().min(1),
    price: z.number().nonnegative(),
  }),
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  ...(pilotAIBudgetEnabled() ? { maxRetries: 0, timeout: 60000 } : {}),
});

export async function POST(request: Request) {
  const legalResponse = await requireAgreements(request); if (legalResponse) return legalResponse;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsedRequest = requestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Missing required field: ingredients" },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing." },
      { status: 500 },
    );
  }

  const systemPrompt =
    "You are a culinary data parser and grocery estimator. Combine duplicate ingredients from the provided list. Mathematically add matching or convertible units (e.g., 2 cups + 2 cups = 4 cups). You MUST completely deduplicate the list. If an item appears twice, combine them into a single line item. Return ONLY a flat, valid JSON array of objects. Each object must contain a name string and a price number in USD. Do not return markdown, code blocks, or conversational text.";

  try {
    const pilotBudget = await pilotAIBudget(body); if (pilotBudget) return pilotBudget;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      ...(pilotAIBudgetEnabled() ? { max_completion_tokens: 2000 } : {}),
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify(parsedRequest.data.ingredients),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 500 },
      );
    }

    const cleanedContent = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .replace(/^[^[{]*([\[{])/, "$1")
      .trim();

    const parsed = responseSchema.parse(JSON.parse(cleanedContent));
    const dietarySafety = assessDiet(parsed.map(i => i.name), parsedRequest.data.diet);
    const original = parsedRequest.data.ingredients;
    const qualifiers = original.filter(i => /free|allerg|milk|wheat|soy|sesame|nut|peanut/i.test(i));
    if (dietarySafety.conflicts.length || qualifiers.some(i => !parsed.some(r => r.name.toLowerCase().includes(i.toLowerCase())))) return NextResponse.json({ error: "Ingredient transformation needs review. Keep the original ingredient list and dietary qualifiers.", dietarySafety }, { status: 422 });
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
