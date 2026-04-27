import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildAvoidanceGuidance,
  buildAdventureLevelGuidance,
  buildMustHaveGuidance,
  normalizeDietaryPreferences,
} from "@/lib/meal-request-normalization";
import { buildGenerateListPrompts } from "@/lib/meal-prompt-builders";

type GenerateListRequest = {
  budget: number;
  diet: string;
  householdSize: number;
  combinedPantryItems: string;
  fullyStocked?: string[];
  runningLow?: string[];
  restock?: string[];
  mustHaveIngredient?: string;
  avoidIngredients?: string;
  includeDessert?: boolean;
  adventureLevel?: string;
  apply_upgrades?: boolean;
  existingMeals?: string;
  availableEquipment?: string[];
  prepTime?: string;
  generationQuality?: "free" | "plus";
};

const ingredientSchema = z.object({
  name: z.string().min(1),
  amount: z.string().min(1),
  price: z.number().min(0.01),
});

const mealSchema = z.object({
  day: z.string().min(1),
  name: z.string().min(1),
  servings: z.number().int().positive().optional(),
  notes: z.string().min(1).optional(),
  ingredients: z.array(ingredientSchema).min(1),
  imageUrl: z.string().url().optional(),
});

const groceryItemSchema = z.object({
  category: z.string().min(1),
  item: z.string().min(1),
  estimated_price: z.number().nonnegative(),
});

const dessertSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  ingredients: z.array(ingredientSchema).min(1),
  imageUrl: z.string().url().optional(),
});

const aiGenerateListResponseSchema = z.object({
  meals: z.array(mealSchema).length(7),
  estimated_total_cost: z.number().nonnegative(),
  budget_summary: z.string().min(1),
  upgrade_available: z.boolean(),
  desserts: z.array(dessertSchema).max(2).default([]),
});

type GenerateListResponse = z.infer<typeof aiGenerateListResponseSchema> & {
  restock_items: Array<z.infer<typeof groceryItemSchema>>;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 0,
  timeout: 45000,
});

const OPENAI_REQUEST_TIMEOUT_MS = 45000;

function estimateRestockPrice(itemName: string) {
  const normalized = itemName.trim().toLowerCase();
  let estimate = 3;

  if (
    normalized.includes("steak") ||
    normalized.includes("salmon") ||
    normalized.includes("shrimp") ||
    normalized.includes("seafood")
  ) {
    estimate = 10;
  } else if (
    normalized.includes("chicken") ||
    normalized.includes("pork") ||
    normalized.includes("beef") ||
    normalized.includes("cheese")
  ) {
    estimate = 6;
  } else if (
    normalized.includes("oil") ||
    normalized.includes("sauce") ||
    normalized.includes("butter") ||
    normalized.includes("milk")
  ) {
    estimate = 4;
  } else if (
    normalized.includes("rice") ||
    normalized.includes("pasta") ||
    normalized.includes("beans") ||
    normalized.includes("carrots") ||
    normalized.includes("produce") ||
    normalized.includes("potatoes")
  ) {
    estimate = 2;
  }

  return Math.max(1, estimate);
}

function findBlockedContentMatches(
  meals: Array<z.infer<typeof mealSchema>>,
  blockedIngredients: string[],
) {
  if (blockedIngredients.length === 0) {
    return [];
  }

  const loweredBlocked = blockedIngredients.map((item) => item.toLowerCase());

  return meals.flatMap((meal) => {
    const haystacks = [
      meal.name.toLowerCase(),
      meal.notes?.toLowerCase() ?? "",
      ...meal.ingredients.map((ingredient) => ingredient.name.toLowerCase()),
    ];

    return loweredBlocked.filter((blocked) =>
      haystacks.some((value) => value.includes(blocked)),
    );
  });
}

function normalizeGeneratedMeals(
  meals: Array<z.infer<typeof mealSchema>>,
  householdSize: number,
) {
  return meals.map((meal, index) => ({
    ...meal,
    day: meal.day || `Day ${index + 1}`,
    servings: meal.servings ?? householdSize,
    notes:
      meal.notes?.trim() ||
      `A practical dinner built around ${meal.ingredients
        .slice(0, 3)
        .map((ingredient) => ingredient.name)
        .join(", ")}.`,
  }));
}

function findRepeatedSignatureTitleWords(meals: Array<z.infer<typeof mealSchema>>) {
  const trackedWords = {
    cumin: 3,
    paprika: 3,
    garlic: 3,
    cajun: 2,
    chipotle: 2,
    jerk: 2,
    curry: 2,
    teriyaki: 2,
    bbq: 2,
    "lemon pepper": 2,
  } as const;

  const counts = new Map<string, number>();

  meals.forEach((meal) => {
    const loweredTitle = meal.name.toLowerCase();
    Object.keys(trackedWords).forEach((word) => {
      if (loweredTitle.includes(word)) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    });
  });

  return Array.from(counts.entries())
    .filter(([word, count]) => count >= trackedWords[word as keyof typeof trackedWords])
    .map(([word]) => word);
}

function buildEquipmentSet(availableEquipment?: string[]) {
  return new Set(
    (Array.isArray(availableEquipment) ? availableEquipment : [])
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function findEquipmentViolations(
  meals: Array<z.infer<typeof mealSchema>>,
  selectedEquipmentSet: Set<string>,
) {
  const violations: string[] = [];

  meals.forEach((meal) => {
    const haystack = `${meal.name} ${meal.notes ?? ""}`.toLowerCase();

    if (!selectedEquipmentSet.has("Oven")) {
      if (
        /\bbaked\b|\broasted\b|\bsheet[- ]pan\b|\bcasserole\b|\bgratin\b|\bbroiled\b/.test(
          haystack,
        )
      ) {
        violations.push(`Oven required for "${meal.name}"`);
      }
    }

    if (!selectedEquipmentSet.has("Grill")) {
      if (/\bgrilled\b|\bon the grill\b|\bchar[- ]grilled\b/.test(haystack)) {
        violations.push(`Grill required for "${meal.name}"`);
      }
    }

    if (!selectedEquipmentSet.has("Air Fryer")) {
      if (/\bair fryer\b|\bair[- ]fried\b/.test(haystack)) {
        violations.push(`Air Fryer required for "${meal.name}"`);
      }
    }

    if (!selectedEquipmentSet.has("Slow Cooker")) {
      if (/\bslow cooker\b|\bcrockpot\b/.test(haystack)) {
        violations.push(`Slow Cooker required for "${meal.name}"`);
      }
    }

    if (!selectedEquipmentSet.has("Blender")) {
      if (/\bblender\b|\bblended\b|\bpur[eé]ed\b/.test(haystack)) {
        violations.push(`Blender required for "${meal.name}"`);
      }
    }
  });

  return Array.from(new Set(violations));
}

function findMissingSelectedEquipmentUsage(
  meals: Array<z.infer<typeof mealSchema>>,
  selectedEquipmentSet: Set<string>,
) {
  const haystacks = meals.map((meal) => `${meal.name} ${meal.notes ?? ""}`.toLowerCase());
  const missing: string[] = [];

  if (
    selectedEquipmentSet.has("Air Fryer") &&
    !haystacks.some((value) => /\bair fryer\b|\bair[- ]fried\b/.test(value))
  ) {
    missing.push("Air Fryer");
  }

  if (
    selectedEquipmentSet.has("Slow Cooker") &&
    !haystacks.some((value) => /\bslow cooker\b|\bcrockpot\b/.test(value))
  ) {
    missing.push("Slow Cooker");
  }

  if (
    selectedEquipmentSet.has("Grill") &&
    !haystacks.some((value) => /\bgrilled\b|\bon the grill\b|\bchar[- ]grilled\b/.test(value))
  ) {
    missing.push("Grill");
  }

  return missing;
}

function inferPrimaryProtein(meal: z.infer<typeof mealSchema>) {
  const haystack = `${meal.name} ${meal.notes ?? ""} ${meal.ingredients
    .map((ingredient) => ingredient.name)
    .join(" ")}`.toLowerCase();

  if (/\bground chicken\b|\bchicken\b/.test(haystack)) {
    return "chicken";
  }
  if (/\bground turkey\b|\bturkey\b/.test(haystack)) {
    return "turkey";
  }
  if (/\bground beef\b|\bbeef\b|\bsteak\b/.test(haystack)) {
    return "beef";
  }
  if (/\bpork\b|\bsausage\b|\bham\b/.test(haystack)) {
    return "pork";
  }
  if (/\bshrimp\b/.test(haystack)) {
    return "shrimp";
  }
  if (/\bsalmon\b|\bfish\b|\btilapia\b|\bcod\b/.test(haystack)) {
    return "fish";
  }
  if (/\btofu\b/.test(haystack)) {
    return "tofu";
  }
  if (/\bbean\b|\blentil\b|\bchickpea\b/.test(haystack)) {
    return "legume";
  }

  return "other";
}

function findOverusedProteins(meals: Array<z.infer<typeof mealSchema>>) {
  const counts = new Map<string, number>();

  meals.forEach((meal) => {
    const protein = inferPrimaryProtein(meal);
    if (!protein || protein === "other") {
      return;
    }
    counts.set(protein, (counts.get(protein) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 2)
    .map(([protein, count]) => `${protein} (${count})`);
}

function inferMealFamily(meal: z.infer<typeof mealSchema>) {
  const title = meal.name.toLowerCase();

  const families = [
    "burger",
    "wrap",
    "taco",
    "quesadilla",
    "pasta",
    "spaghetti",
    "curry",
    "stir-fry",
    "skillet",
    "sheet-pan",
    "bowl",
    "soup",
    "salad",
    "sandwich",
    "casserole",
  ] as const;

  for (const family of families) {
    const matcher =
      family === "stir-fry"
        ? /\bstir[- ]fry\b/
        : family === "sheet-pan"
          ? /\bsheet[- ]pan\b/
          : new RegExp(`\\b${family.replace("-", "[- ]")}\\b`);

    if (matcher.test(title)) {
      return family;
    }
  }

  return "other";
}

function findRepeatedMealFamilies(meals: Array<z.infer<typeof mealSchema>>) {
  const counts = new Map<string, number>();

  meals.forEach((meal) => {
    const family = inferMealFamily(meal);
    if (!family || family === "other") {
      return;
    }
    counts.set(family, (counts.get(family) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 2)
    .map(([family, count]) => `${family} (${count})`);
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
    fullyStocked,
    runningLow,
    restock,
    mustHaveIngredient,
    avoidIngredients,
    includeDessert,
    adventureLevel,
    apply_upgrades,
    existingMeals,
    availableEquipment,
    prepTime,
    generationQuality,
  } =
    (body as Partial<GenerateListRequest>) ?? {};
  const isPlusGeneration = generationQuality === "plus";

  const selectedEquipment =
    Array.isArray(availableEquipment) && availableEquipment.length > 0
      ? availableEquipment.join(", ")
      : "Oven, Stovetop, Microwave";
  const selectedEquipmentSet = buildEquipmentSet(availableEquipment);

  if (
    typeof budget !== "number" ||
    typeof diet !== "string" ||
    typeof householdSize !== "number" ||
    typeof combinedPantryItems !== "string"
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: budget, diet, householdSize, combinedPantryItems",
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

  const { systemPrompt, userPrompt } = buildGenerateListPrompts({
    adventureGuidance: adventureGuidance.generationBlock,
    adventureLevel: adventureLevel?.trim() || "No preference provided",
    applyUpgrades: Boolean(apply_upgrades),
    avoidancePromptBlock: avoidanceGuidance.promptBlock,
    budget,
    combinedPantryItems,
    dietaryPromptBlock: dietaryPreferences.promptBlock,
    existingMeals: existingMeals?.trim() || "None provided",
    fullyStocked: Array.isArray(fullyStocked) ? fullyStocked : [],
    householdSize,
    includeDessert: Boolean(includeDessert),
    mustHavePromptBlock: mustHaveGuidance.promptBlock,
    prepTime,
    restock: Array.isArray(restock) ? restock : [],
    runningLow: Array.isArray(runningLow) ? runningLow : [],
    selectedEquipment,
  });

  try {
    async function requestMealPlan(retryInstruction?: string) {
      const response = await openai.chat.completions.create(
        {
          model: "gpt-4.1",
          response_format: { type: "json_object" },
          temperature: 0.4,
          messages: [
            { role: "system", content: systemPrompt.trim() },
            { role: "user", content: userPrompt.trim() },
            ...(retryInstruction
              ? [{ role: "user" as const, content: retryInstruction }]
              : []),
          ],
        },
        {
          timeout: OPENAI_REQUEST_TIMEOUT_MS,
        },
      );

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI returned an empty response.");
      }

      return JSON.parse(content) as z.infer<typeof aiGenerateListResponseSchema>;
    }

    let rawPlan = await requestMealPlan();

    if (!Array.isArray(rawPlan.meals) || rawPlan.meals.length !== 7) {
      rawPlan = await requestMealPlan(
        "CRITICAL RETRY: Your last response did not return exactly 7 dinner meals. Return valid JSON with exactly 7 meal objects and the required shape. Desserts are optional and may be 0, 1, or 2 items.",
      );
    }

    let parsed = aiGenerateListResponseSchema.parse(rawPlan);
    parsed = {
      ...parsed,
      meals: normalizeGeneratedMeals(parsed.meals, householdSize),
    };
    let blockedMatches = findBlockedContentMatches(
      parsed.meals,
      [...dietaryPreferences.blockedIngredients, ...avoidanceGuidance.avoidedItems],
    );
    let repeatedSignatureWords = findRepeatedSignatureTitleWords(parsed.meals);
    let equipmentViolations = findEquipmentViolations(parsed.meals, selectedEquipmentSet);
    let missingSelectedEquipmentUsage = findMissingSelectedEquipmentUsage(
      parsed.meals,
      selectedEquipmentSet,
    );
    let overusedProteins = findOverusedProteins(parsed.meals);
    let repeatedMealFamilies = findRepeatedMealFamilies(parsed.meals);

    if (
      blockedMatches.length > 0 ||
      repeatedSignatureWords.length > 0 ||
      equipmentViolations.length > 0
    ) {
      rawPlan = await requestMealPlan(
        `CRITICAL RETRY: Fix these issues and return a fresh plan with valid JSON only. Blocked diet or avoidance terms found: ${Array.from(new Set(blockedMatches)).join(", ") || "none"}. Repeated signature flavor/title words found: ${repeatedSignatureWords.join(", ") || "none"}. Equipment rule violations found: ${equipmentViolations.join(", ") || "none"}. Return exactly 7 dinner meals. Desserts may be 0, 1, or 2 items.`,
      );
      parsed = aiGenerateListResponseSchema.parse(rawPlan);
      parsed = {
        ...parsed,
        meals: normalizeGeneratedMeals(parsed.meals, householdSize),
      };
      blockedMatches = findBlockedContentMatches(
        parsed.meals,
        [...dietaryPreferences.blockedIngredients, ...avoidanceGuidance.avoidedItems],
      );
      repeatedSignatureWords = findRepeatedSignatureTitleWords(parsed.meals);
      equipmentViolations = findEquipmentViolations(parsed.meals, selectedEquipmentSet);
      missingSelectedEquipmentUsage = findMissingSelectedEquipmentUsage(
        parsed.meals,
        selectedEquipmentSet,
      );
      overusedProteins = findOverusedProteins(parsed.meals);
      repeatedMealFamilies = findRepeatedMealFamilies(parsed.meals);
    }

    if (
      isPlusGeneration &&
      (
        missingSelectedEquipmentUsage.length > 0 ||
        overusedProteins.length > 0 ||
        repeatedMealFamilies.length > 0
      )
    ) {
      rawPlan = await requestMealPlan(
        `PLUS REFINEMENT RETRY: Keep the same budget, diet, pantry, and prep-time constraints, but improve the weekly plan quality. Fix these soft-quality issues: missing selected special equipment usage: ${missingSelectedEquipmentUsage.join(", ") || "none"}. Overused proteins: ${overusedProteins.join(", ") || "none"}. Repeated meal families: ${repeatedMealFamilies.join(", ") || "none"}. Return a noticeably more varied, balanced weekly plan with exactly 7 dinner meals and valid JSON only. Desserts may be 0, 1, or 2 items.`,
      );
      parsed = aiGenerateListResponseSchema.parse(rawPlan);
      parsed = {
        ...parsed,
        meals: normalizeGeneratedMeals(parsed.meals, householdSize),
      };
      blockedMatches = findBlockedContentMatches(
        parsed.meals,
        [...dietaryPreferences.blockedIngredients, ...avoidanceGuidance.avoidedItems],
      );
      repeatedSignatureWords = findRepeatedSignatureTitleWords(parsed.meals);
      equipmentViolations = findEquipmentViolations(parsed.meals, selectedEquipmentSet);
      missingSelectedEquipmentUsage = findMissingSelectedEquipmentUsage(
        parsed.meals,
        selectedEquipmentSet,
      );
      overusedProteins = findOverusedProteins(parsed.meals);
      repeatedMealFamilies = findRepeatedMealFamilies(parsed.meals);
    }

    if (blockedMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Generated meals violated dietary restrictions or explicit avoid rules by including blocked terms: ${Array.from(new Set(blockedMatches)).join(", ")}`,
        },
        { status: 500 },
      );
    }

    if (repeatedSignatureWords.length > 0) {
      return NextResponse.json(
        {
          error: `Generated meals still repeated signature flavor words in titles after retry: ${repeatedSignatureWords.join(", ")}`,
        },
        { status: 500 },
      );
    }

    if (equipmentViolations.length > 0) {
      return NextResponse.json(
        {
          error: `Generated meals required unselected equipment after retry: ${equipmentViolations.join(", ")}`,
        },
        { status: 500 },
      );
    }

    const deterministicRestockItems = (Array.isArray(restock) ? restock : [])
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        category: "Restock",
        item: `${item} [RESTOCK]`,
        estimated_price: Math.max(1, estimateRestockPrice(item)),
      }));

    const recalculatedTotal =
      parsed.meals.reduce(
        (sum, meal) =>
          sum +
          meal.ingredients.reduce(
            (ingredientSum, ingredient) =>
              ingredientSum + ingredient.price,
            0,
          ),
        0,
      ) +
      deterministicRestockItems.reduce(
        (sum, item) => sum + item.estimated_price,
        0,
      );

    return NextResponse.json({
      ...parsed,
      meals: parsed.meals,
      restock_items: deterministicRestockItems,
      estimated_total_cost: recalculatedTotal,
      desserts: parsed.desserts,
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
