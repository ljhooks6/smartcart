import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
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
  includeDessert?: boolean;
  adventureLevel?: string;
  budgetTightness?: boolean;
  apply_upgrades?: boolean;
  existingMeals?: string;
  availableEquipment?: string[];
};

const ingredientSchema = z.object({
  name: z.string().min(1),
  amount: z.string().min(1),
  price: z.number().min(0.01),
});

const mealSchema = z.object({
  day: z.string().min(1),
  name: z.string().min(1),
  servings: z.number().int().positive(),
  notes: z.string().min(1),
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
  meals: z.array(mealSchema).length(8),
  estimated_total_cost: z.number().nonnegative(),
  budget_summary: z.string().min(1),
  upgrade_available: z.boolean(),
  desserts: z.union([z.array(dessertSchema).length(2), z.array(dessertSchema).length(0)]),
});

type GenerateListResponse = z.infer<typeof aiGenerateListResponseSchema> & {
  restock_items: Array<z.infer<typeof groceryItemSchema>>;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

function getImageSearchBase(title: string) {
  return title.split(/\s+with\s+/i)[0]?.trim() || title.trim();
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
      meal.notes.toLowerCase(),
      ...meal.ingredients.map((ingredient) => ingredient.name.toLowerCase()),
    ];

    return loweredBlocked.filter((blocked) =>
      haystacks.some((value) => value.includes(blocked)),
    );
  });
}

function findRepeatedSignatureTitleWords(meals: Array<z.infer<typeof mealSchema>>) {
  const trackedWords = [
    "cumin",
    "paprika",
    "garlic",
    "cajun",
    "chipotle",
    "jerk",
    "curry",
    "teriyaki",
    "bbq",
    "lemon pepper",
  ];

  const counts = new Map<string, number>();

  meals.forEach((meal) => {
    const loweredTitle = meal.name.toLowerCase();
    trackedWords.forEach((word) => {
      if (loweredTitle.includes(word)) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    });
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([word]) => word);
}

async function fetchUnsplashImage(query: string, queryIsEncoded = false) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return undefined;
  }

  const searchQuery = queryIsEncoded ? query : `${query} food`;
  const encodedQuery = queryIsEncoded
    ? searchQuery
    : encodeURIComponent(searchQuery);
  console.log("--- UNSPLASH DIAGNOSTIC ---");
  console.log("Query:", searchQuery);
  console.log("Key exists?", !!process.env.UNSPLASH_ACCESS_KEY);

  const url = `https://api.unsplash.com/search/photos?query=${encodedQuery}&client_id=${process.env.UNSPLASH_ACCESS_KEY}&per_page=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as {
      results?: Array<{ urls?: { regular?: string; small?: string } }>;
      errors?: string[];
    };

    console.log("Response Status:", response.status);
    console.log("Data Results Length:", data.results?.length);
    if (data.errors) {
      console.log("Unsplash API Errors:", data.errors);
    }

    if (!data?.results || data.results.length === 0) {
      return undefined;
    }

    const imageUrl =
      data.results[0]?.urls?.regular ?? data.results[0]?.urls?.small;

    return imageUrl || undefined;
  } catch {
    return undefined;
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
    budget,
    diet,
    householdSize,
    combinedPantryItems,
    fullyStocked,
    runningLow,
    restock,
    mustHaveIngredient,
    includeDessert,
    adventureLevel,
    budgetTightness,
    apply_upgrades,
    existingMeals,
    availableEquipment,
  } =
    (body as Partial<GenerateListRequest>) ?? {};

  const selectedEquipment =
    Array.isArray(availableEquipment) && availableEquipment.length > 0
      ? availableEquipment.join(", ")
      : "Oven, Stovetop, Microwave";

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

  const { systemPrompt, userPrompt } = buildGenerateListPrompts({
    adventureGuidance: adventureGuidance.generationBlock,
    adventureLevel: adventureLevel?.trim() || "No preference provided",
    applyUpgrades: Boolean(apply_upgrades),
    budget,
    budgetTightness,
    combinedPantryItems,
    dietaryPromptBlock: dietaryPreferences.promptBlock,
    existingMeals: existingMeals?.trim() || "None provided",
    fullyStocked: Array.isArray(fullyStocked) ? fullyStocked : [],
    householdSize,
    includeDessert: Boolean(includeDessert),
    mustHavePromptBlock: mustHaveGuidance.promptBlock,
    restock: Array.isArray(restock) ? restock : [],
    runningLow: Array.isArray(runningLow) ? runningLow : [],
    selectedEquipment,
  });

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

    const parsed = aiGenerateListResponseSchema.parse(JSON.parse(content));
    const blockedMatches = findBlockedContentMatches(
      parsed.meals,
      dietaryPreferences.blockedIngredients,
    );
    const repeatedSignatureWords = findRepeatedSignatureTitleWords(parsed.meals);

    if (blockedMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Generated meals violated dietary restrictions by including blocked terms: ${Array.from(new Set(blockedMatches)).join(", ")}`,
        },
        { status: 500 },
      );
    }

    if (repeatedSignatureWords.length > 0) {
      return NextResponse.json(
        {
          error: `Generated meals repeated signature flavor words in titles: ${repeatedSignatureWords.join(", ")}`,
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

    const [mealImages, dessertImages] = await Promise.all([
      Promise.all(
        parsed.meals.map((meal) =>
          fetchUnsplashImage(getImageSearchBase(meal.name)),
        ),
      ),
      Promise.all(
        parsed.desserts.map((dessert) =>
          fetchUnsplashImage(
            encodeURIComponent(`${getImageSearchBase(dessert.title)} dessert`),
            true,
          ),
        ),
      ),
    ]);

    const mealsWithImages = parsed.meals.map((meal, index) => ({
      ...meal,
      imageUrl: mealImages[index],
    }));

    const dessertsWithImages = parsed.desserts.map((dessert, index) => ({
      ...dessert,
      imageUrl: dessertImages[index],
    }));

    return NextResponse.json({
      ...parsed,
      meals: mealsWithImages,
      restock_items: deterministicRestockItems,
      estimated_total_cost: recalculatedTotal,
      desserts: dessertsWithImages,
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
