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
  maxRetries: 0,
  timeout: 30000,
});

const TITLE_STOP_WORDS = new Set([
  "and",
  "with",
  "the",
  "a",
  "an",
  "style",
  "classic",
  "crispy",
  "creamy",
  "spicy",
  "easy",
  "weeknight",
  "loaded",
  "homestyle",
  "fresh",
  "roasted",
  "grilled",
  "baked",
]);

const TITLE_FAMILY_KEYWORDS = [
  "burger",
  "wrap",
  "taco",
  "quesadilla",
  "pasta",
  "spaghetti",
  "meatball",
  "stir-fry",
  "stir fry",
  "skillet",
  "curry",
  "bowl",
  "sheet-pan",
  "sheet pan",
  "salad",
  "sandwich",
  "soup",
  "chili",
] as const;

function buildEquipmentSet(availableEquipment?: string[]) {
  return new Set(
    (Array.isArray(availableEquipment) ? availableEquipment : [])
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function findReplacementEquipmentViolations(
  title: string,
  description: string,
  selectedEquipmentSet: Set<string>,
) {
  const haystack = `${title} ${description}`.toLowerCase();
  const violations: string[] = [];

  if (
    !selectedEquipmentSet.has("Oven") &&
    /\bbaked\b|\broasted\b|\bsheet[- ]pan\b|\bcasserole\b|\bgratin\b|\bbroiled\b/.test(
      haystack,
    )
  ) {
    violations.push("Oven");
  }

  if (
    !selectedEquipmentSet.has("Grill") &&
    /\bgrilled\b|\bon the grill\b|\bchar[- ]grilled\b/.test(haystack)
  ) {
    violations.push("Grill");
  }

  if (
    !selectedEquipmentSet.has("Air Fryer") &&
    /\bair fryer\b|\bair[- ]fried\b/.test(haystack)
  ) {
    violations.push("Air Fryer");
  }

  if (
    !selectedEquipmentSet.has("Slow Cooker") &&
    /\bslow cooker\b|\bcrockpot\b/.test(haystack)
  ) {
    violations.push("Slow Cooker");
  }

  if (
    !selectedEquipmentSet.has("Blender") &&
    /\bblender\b|\bblended\b|\bpur[eé]ed\b/.test(haystack)
  ) {
    violations.push("Blender");
  }

  return Array.from(new Set(violations));
}

function extractMeaningfulTitleTokens(title: string) {
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !TITLE_STOP_WORDS.has(token)),
    ),
  );
}

function findTitleFamily(title: string) {
  const lowered = title.toLowerCase();
  return TITLE_FAMILY_KEYWORDS.find((keyword) => lowered.includes(keyword)) ?? null;
}

function isTooSimilarToRejectedMeal(rejectedTitle: string, replacementTitle: string) {
  const rejectedTokens = extractMeaningfulTitleTokens(rejectedTitle);
  const replacementTokens = extractMeaningfulTitleTokens(replacementTitle);
  const sharedTokens = rejectedTokens.filter((token) =>
    replacementTokens.includes(token),
  );
  const rejectedFamily = findTitleFamily(rejectedTitle);
  const replacementFamily = findTitleFamily(replacementTitle);

  if (sharedTokens.length >= 2) {
    return true;
  }

  if (rejectedFamily && replacementFamily && rejectedFamily === replacementFamily) {
    return true;
  }

  return false;
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
  const selectedEquipmentSet = buildEquipmentSet(availableEquipment);

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
    async function requestReplacement(retryInstruction?: string) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: userPrompt.trim() },
          ...(retryInstruction
            ? [{ role: "user" as const, content: retryInstruction }]
            : []),
        ],
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI returned an empty response.");
      }

      return replaceMealResponseSchema.parse(JSON.parse(content));
    }

    let parsed = await requestReplacement();

    const validateReplacement = (candidate: z.infer<typeof replaceMealResponseSchema>) => {
      const replacementHaystacks = [
        candidate.title.toLowerCase(),
        candidate.description.toLowerCase(),
        ...candidate.ingredients.map((ingredient) => ingredient.toLowerCase()),
      ];
      const blockedMatches = dietaryPreferences.blockedIngredients.filter((blocked) =>
        replacementHaystacks.some((value) => value.includes(blocked)),
      );
      const avoidedMatches = avoidanceGuidance.avoidedItems.filter((blocked) =>
        replacementHaystacks.some((value) => value.includes(blocked)),
      );
      const equipmentViolations = findReplacementEquipmentViolations(
        candidate.title,
        candidate.description,
        selectedEquipmentSet,
      );
      const normalizedReplacementTitle = candidate.title.trim().toLowerCase();
      const titleCollision = blockedTitles.some((title) => title === normalizedReplacementTitle);
      const titleSimilarity = isTooSimilarToRejectedMeal(
        rejectedMealTitle,
        candidate.title,
      );

      return {
        avoidedMatches,
        blockedMatches,
        equipmentViolations,
        titleCollision,
        titleSimilarity,
      };
    };

    let validation = validateReplacement(parsed);

    if (
      validation.blockedMatches.length > 0 ||
      validation.avoidedMatches.length > 0 ||
      validation.equipmentViolations.length > 0 ||
      validation.titleCollision ||
      validation.titleSimilarity
    ) {
      parsed = await requestReplacement(
        `CRITICAL RETRY: The last replacement was still too close to the rejected or existing meals. Blocked terms: ${Array.from(new Set([...validation.blockedMatches, ...validation.avoidedMatches])).join(", ") || "none"}. Equipment violations: ${validation.equipmentViolations.join(", ") || "none"}. Exact title collision: ${validation.titleCollision ? "yes" : "no"}. Too similar to rejected meal family/title: ${validation.titleSimilarity ? "yes" : "no"}. Return a clearly different replacement meal.`,
      );
      validation = validateReplacement(parsed);
    }

    if (validation.blockedMatches.length > 0 || validation.avoidedMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Replacement meal violated dietary restrictions or avoid rules by including blocked terms: ${Array.from(new Set([...validation.blockedMatches, ...validation.avoidedMatches])).join(", ")}`,
        },
        { status: 500 },
      );
    }

    if (validation.titleCollision || validation.titleSimilarity) {
      return NextResponse.json(
        {
          error: `Replacement meal was still too similar to a rejected or existing meal: ${parsed.title}`,
        },
        { status: 500 },
      );
    }

    if (validation.equipmentViolations.length > 0) {
      return NextResponse.json(
        {
          error: `Replacement meal required unselected equipment: ${validation.equipmentViolations.join(", ")}`,
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
