import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildAdventureLevelGuidance,
  buildMustHaveGuidance,
  normalizeDietaryPreferences,
  parseMealNameList,
} from "@/lib/meal-request-normalization";

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
  currentMealsContext?: string;
  recentRejectedMeals?: string[];
  availableEquipment?: string[];
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
    currentMealsContext,
    recentRejectedMeals,
    availableEquipment,
  } = (body as Partial<ReplaceMealRequest>) ?? {};

  const selectedEquipment =
    Array.isArray(availableEquipment) && availableEquipment.length > 0
      ? availableEquipment.join(", ")
      : "Oven, Stovetop, Microwave";

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

  const dietaryPreferences = normalizeDietaryPreferences(diet);
  const mustHaveGuidance = buildMustHaveGuidance(mustHaveIngredient);
  const adventureGuidance = buildAdventureLevelGuidance(adventureLevel);
  const blockedTitles = Array.from(
    new Set([
      ...parseMealNameList(existingMeals),
      ...parseMealNameList(currentMealsContext),
      ...((Array.isArray(recentRejectedMeals) ? recentRejectedMeals : []).map((meal) =>
        meal.trim().toLowerCase(),
      )),
      rejectedMealTitle.trim().toLowerCase(),
    ]),
  ).filter(Boolean);

  const systemPrompt = `
You are an expert budget-conscious meal planner helping replace a single rejected dinner.

Rules:
- Generate exactly ONE replacement meal.
- The replacement must feel clearly different from the rejected meal title in flavor profile, format, and primary ingredients.
- CRITICAL: Do NOT suggest, generate, or return any of the following meals: ${existingMeals?.trim() || "None provided"}.
- CURRENT MENU CONTEXT: The user already has these meals: ${(currentMealsContext ?? existingMeals)?.trim() || "None provided"}. STRICT RULE: Provide a completely different main protein and flavor profile from the majority of the current menu.
- RECENTLY REJECTED OR BLOCKED TITLES: ${blockedTitles.join(", ") || "None provided"}.
- CRITICAL: You may ONLY generate recipes that can be prepared using the following equipment: ${selectedEquipment}. Do not suggest recipes requiring unselected hardware.
- Respect the user's budget, diet, household size, pantry items, and prep-time preference.
- DIETARY SAFETY: Treat blocked ingredients and blocked categories as hard bans. Never include them in the replacement title, description, or ingredients.
- ${mustHaveGuidance.promptBlock}
- Adventure Level enforcement:
  - Stick to basics: choose a familiar meal style such as burgers and fries, wraps, tacos, pasta, baked chicken, or other approachable weeknight staples.
  - Mix it up: choose something distinct but still approachable.
  - Try new cuisines: choose a clearly different cuisine or flavor lane from the rejected meal and the current menu.
- ${adventureGuidance.replacementBlock}
- CRITICAL REPLACEMENT DISTINCTNESS: the replacement must differ from the rejected meal in at least TWO of these dimensions: main protein, cuisine lane, cooking format, or starch/side pairing.
- CRITICAL REPLACEMENT SAFETY: never return the rejected meal again, never return a tiny rename of the rejected meal, and never return a title that is already present in the current menu context.
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
Available Kitchen Equipment: ${selectedEquipment}
${dietaryPreferences.promptBlock}
${mustHaveGuidance.promptBlock}
${adventureGuidance.replacementBlock}

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
    const replacementHaystacks = [
      parsed.title.toLowerCase(),
      parsed.description.toLowerCase(),
      ...parsed.ingredients.map((ingredient) => ingredient.toLowerCase()),
    ];
    const blockedMatches = dietaryPreferences.blockedIngredients.filter((blocked) =>
      replacementHaystacks.some((value) => value.includes(blocked)),
    );
    const normalizedReplacementTitle = parsed.title.trim().toLowerCase();
    const titleCollision = blockedTitles.some((title) => title === normalizedReplacementTitle);

    if (blockedMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Replacement meal violated dietary restrictions by including blocked terms: ${Array.from(new Set(blockedMatches)).join(", ")}`,
        },
        { status: 500 },
      );
    }

    if (titleCollision) {
      return NextResponse.json(
        {
          error: `Replacement meal repeated a rejected or existing title: ${parsed.title}`,
        },
        { status: 500 },
      );
    }

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
