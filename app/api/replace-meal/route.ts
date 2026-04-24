import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildAvoidanceGuidance,
  buildAdventureLevelGuidance,
  buildMustHaveGuidance,
  normalizeDietaryPreferences,
  parseMealNameList,
} from "@/lib/meal-request-normalization";
import { buildReplaceMealPrompts } from "@/lib/meal-prompt-builders";

type ReplaceMealRequest = {
  budget: number;
  diet: string;
  householdSize: number;
  combinedPantryItems: string;
  rejectedMealTitle: string;
  prepTime?: string;
  adventureLevel?: string;
  mustHaveIngredient?: string;
  avoidIngredients?: string;
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
    avoidIngredients,
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
  const avoidanceGuidance = buildAvoidanceGuidance(avoidIngredients);
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

  const { systemPrompt, userPrompt } = buildReplaceMealPrompts({
    adventureGuidance: adventureGuidance.replacementBlock,
    adventureLevel: adventureLevel || "No preference provided",
    avoidancePromptBlock: avoidanceGuidance.promptBlock,
    blockedTitles,
    budget,
    combinedPantryItems,
    currentMealsContext: (currentMealsContext ?? existingMeals)?.trim() || "None provided",
    dietaryPromptBlock: dietaryPreferences.promptBlock,
    existingMeals: existingMeals?.trim() || "None provided",
    householdSize,
    mustHavePromptBlock: mustHaveGuidance.promptBlock,
    prepTime,
    rejectedMealTitle,
    selectedEquipment,
  });

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
    const avoidedMatches = avoidanceGuidance.avoidedItems.filter((blocked) =>
      replacementHaystacks.some((value) => value.includes(blocked)),
    );
    const normalizedReplacementTitle = parsed.title.trim().toLowerCase();
    const titleCollision = blockedTitles.some((title) => title === normalizedReplacementTitle);

    if (blockedMatches.length > 0 || avoidedMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Replacement meal violated dietary restrictions or avoid rules by including blocked terms: ${Array.from(new Set([...blockedMatches, ...avoidedMatches])).join(", ")}`,
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
