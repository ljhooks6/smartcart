import { culinaryReview, planConstraintIssues, foodTermMatches, equipmentRequirementText } from "./meal-quality";
import { candidateOutputResponse } from "./food-safety-response";
import { foodSafetyResponse } from "./food-safety-response";
import { assessDiet, allergyConflicts, ingredientTexts } from "@/lib/dietary-safety";
import OpenAI from "openai";
import { pilotAIBudget } from "./beta-pilot-ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildAvoidanceGuidance,
  buildAdventureLevelGuidance,
  buildCuisineGuidance,
  buildMustHaveGuidance,
  mealMatchesCuisinePreference,
  normalizeDietaryPreferences,
} from "@/lib/meal-request-normalization";
import { buildGenerateListPrompts } from "@/lib/meal-prompt-builders";
import { normalizeOptionalMeals } from "@/lib/meal-types";

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
  includeBreakfast?: boolean;
  includeLunch?: boolean;
  adventureLevel?: string;
  cuisinePreference?: string;
  apply_upgrades?: boolean;
  existingMeals?: string;
  availableEquipment?: string[];
  prepTime?: string;
  mealSourceMode?: "pantry-and-store" | "pantry-only";
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
  description: z.string().min(1).max(1000).optional(),
  prep_time_minutes: z.number().int().positive().optional(),
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
  prep_time_minutes: z.number().int().positive().optional(),
  ingredients: z.array(ingredientSchema).min(1),
  imageUrl: z.string().url().optional(),
});

const aiGenerateListResponseSchema = z.object({
  meals: z.array(mealSchema).length(7),
  breakfasts: z.array(mealSchema).max(3).default([]),
  lunches: z.array(mealSchema).max(3).default([]),
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
const PLUS_OPENAI_REQUEST_TIMEOUT_MS = 90000;
const FREE_MEAL_GENERATION_MODEL = "gpt-4.1";
const PLUS_MEAL_GENERATION_MODEL = "gpt-6.1-sol";

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
      meal.description?.toLowerCase() ?? "",
      ...meal.ingredients.map((ingredient) => ingredient.name.toLowerCase()),
    ];

    return loweredBlocked.filter((blocked) =>
      haystacks.some((value) => foodTermMatches(value,blocked)),
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
    const haystack = equipmentRequirementText(`${meal.name} ${meal.notes ?? ""} ${meal.description ?? ""}`);

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

function countCuisineAlignedMeals(
  meals: Array<z.infer<typeof mealSchema>>,
  cuisinePreference?: string,
) {
  return meals.filter((meal) => mealMatchesCuisinePreference(cuisinePreference, meal)).length;
}

export async function generateMealPlan(body: unknown, plan: "free" | "plus", onUsage?: (details: unknown) => void) {
  const pilotBudget = await pilotAIBudget(body); if (pilotBudget) return pilotBudget;
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
    includeBreakfast,
    includeLunch,
    adventureLevel,
    cuisinePreference: requestedCuisinePreference,
    apply_upgrades,
    existingMeals,
    availableEquipment,
    prepTime,
    mealSourceMode,
  } =
    (body as Partial<GenerateListRequest>) ?? {};
  const normalizedMealSourceMode =
    mealSourceMode === "pantry-only" ? "pantry-only" : "pantry-and-store";

  const selectedEquipment =
    Array.isArray(availableEquipment) && availableEquipment.length > 0
      ? availableEquipment.join(", ")
      : "Oven, Stovetop, Microwave";
  const selectedEquipmentSet = buildEquipmentSet(availableEquipment?.length ? availableEquipment : ["Oven", "Stovetop", "Microwave"]);

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

  const safetyResponse=foodSafetyResponse({diet,avoidIngredients},true);if(safetyResponse)return safetyResponse;
  const isPlusGeneration = plan === "plus";
  const cuisinePreference = isPlusGeneration && typeof requestedCuisinePreference === "string" ? requestedCuisinePreference : "";

  const dietaryPreferences = normalizeDietaryPreferences(diet);
  const mustHaveGuidance = buildMustHaveGuidance(mustHaveIngredient);
  const adventureGuidance = buildAdventureLevelGuidance(adventureLevel);
  const cuisineGuidance = buildCuisineGuidance(cuisinePreference);
  const avoidanceGuidance = buildAvoidanceGuidance(avoidIngredients);

  const { systemPrompt, userPrompt } = buildGenerateListPrompts({
    adventureGuidance: adventureGuidance.generationBlock,
    adventureLevel: adventureLevel?.trim() || "No preference provided",
    applyUpgrades: Boolean(apply_upgrades),
    avoidancePromptBlock: avoidanceGuidance.promptBlock,
    budget,
    combinedPantryItems,
    cuisinePromptBlock: cuisineGuidance.promptBlock,
    dietaryPromptBlock: dietaryPreferences.promptBlock,
    existingMeals: existingMeals?.trim() || "None provided",
    fullyStocked: Array.isArray(fullyStocked) ? fullyStocked : [],
    householdSize,
    includeDessert: Boolean(includeDessert),
    includeBreakfast: Boolean(includeBreakfast),
    includeLunch: Boolean(includeLunch),
    mustHavePromptBlock: mustHaveGuidance.promptBlock,
    prepTime,
    restock:
      normalizedMealSourceMode === "pantry-only" ? [] : Array.isArray(restock) ? restock : [],
    runningLow: Array.isArray(runningLow) ? runningLow : [],
    selectedEquipment,
    mealSourceMode: normalizedMealSourceMode,
  });

  try {
    const deadline = Date.now() + 240000;
    let providerCalls = 0;
    async function requestMealPlan(retryInstruction?: string) {
      if (++providerCalls > 3 || deadline - Date.now() < 5000) throw new Error("Planning took too long. Please try a new plan.");
      const started = Date.now();
      const response = await openai.chat.completions.create(
        {
          model: isPlusGeneration ? PLUS_MEAL_GENERATION_MODEL : FREE_MEAL_GENERATION_MODEL,
          response_format: { type: "json_object" },
          ...(isPlusGeneration ? { reasoning_effort: "low" as const } : { temperature: 0.4 }),
          messages: [
            { role: "system", content: systemPrompt.trim() },
            { role: "user", content: userPrompt.trim() },
            ...(retryInstruction
              ? [{ role: "user" as const, content: retryInstruction }]
              : []),
          ],
        },
        {
          timeout: Math.min(isPlusGeneration ? PLUS_OPENAI_REQUEST_TIMEOUT_MS : OPENAI_REQUEST_TIMEOUT_MS, deadline - Date.now()),
        },
      );

      onUsage?.({ model: response.model, durationMs: Date.now() - started, usage: response.usage });
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI returned an empty response.");
      }

      return JSON.parse(content) as z.infer<typeof aiGenerateListResponseSchema>;
    }

    let rawPlan = await requestMealPlan();

    if (!Array.isArray(rawPlan.meals) || rawPlan.meals.length !== 7 ||
        (includeBreakfast && rawPlan.breakfasts?.length !== 3) ||
        (includeLunch && rawPlan.lunches?.length !== 3)) {
      rawPlan = await requestMealPlan(
        `CRITICAL RETRY: Return exactly 7 dinner meals in meals, ${includeBreakfast ? "3" : "0"} breakfasts in breakfasts, and ${includeLunch ? "3" : "0"} lunches in lunches. Desserts are optional and may be 0, 1, or 2 items. Keep all requested constraints.`,
      );
    }

    async function parsePlan(raw: typeof rawPlan) {
      const validated=aiGenerateListResponseSchema.safeParse({...raw,breakfasts:includeBreakfast?raw.breakfasts:[],lunches:includeLunch?raw.lunches:[],desserts:includeDessert?raw.desserts:[]});
      if(validated.success)return validated.data;
      const corrected=await requestMealPlan("SCHEMA CORRECTION: "+validated.error.issues.map(i=>i.path.join(".")+": "+i.message).join("; ")+". Use strictly positive ingredient prices; omit water from priced ingredients. Preserve every original constraint and finished-dish description.");
      return aiGenerateListResponseSchema.parse({...corrected,breakfasts:includeBreakfast?corrected.breakfasts:[],lunches:includeLunch?corrected.lunches:[],desserts:includeDessert?corrected.desserts:[]});
    }
    let parsed = await parsePlan(rawPlan);
    parsed = {
      ...parsed,
      meals: normalizeGeneratedMeals(parsed.meals, householdSize),
    };
    const constraintInput = {budget,householdSize,mealSourceMode:normalizedMealSourceMode,combinedPantryItems,fullyStocked,runningLow,restock,prepTime};
    let constraintIssues = planConstraintIssues(parsed,constraintInput);
    let blockedMatches = findBlockedContentMatches(
      [...parsed.meals, ...parsed.breakfasts, ...parsed.lunches,...parsed.desserts.map(d=>({...d,name:d.title,notes:d.description,day:"Dessert"}))],
      [...dietaryPreferences.blockedIngredients, ...avoidanceGuidance.avoidedItems],
    ).concat(allergyConflicts(parsed, diet));
    let repeatedSignatureWords = findRepeatedSignatureTitleWords(parsed.meals);
    let equipmentViolations = findEquipmentViolations([...parsed.meals, ...parsed.breakfasts, ...parsed.lunches,...parsed.desserts.map(d=>({...d,name:d.title,notes:d.description,day:"Dessert"}))], selectedEquipmentSet);
    let missingSelectedEquipmentUsage = findMissingSelectedEquipmentUsage(
      parsed.meals,
      selectedEquipmentSet,
    );
    let overusedProteins = normalizedMealSourceMode === "pantry-only" ? [] : findOverusedProteins(parsed.meals);
    let repeatedMealFamilies = findRepeatedMealFamilies(parsed.meals);
    let cuisineAlignedMeals = countCuisineAlignedMeals(parsed.meals, cuisinePreference);

    if (
      blockedMatches.length > 0 || constraintIssues.length > 0 ||
      equipmentViolations.length > 0
    ) {
      rawPlan = await requestMealPlan(
        `CRITICAL RETRY: ${constraintIssues.join("; ")} Fix these issues and return a fresh plan with valid JSON only. Blocked diet or avoidance terms found: ${Array.from(new Set(blockedMatches)).join(", ") || "none"}. Repeated signature flavor/title words found: ${repeatedSignatureWords.join(", ") || "none"}. Equipment rule violations found: ${equipmentViolations.join(", ") || "none"}. Return exactly 7 dinner meals. Desserts may be 0, 1, or 2 items.`,
      );
      parsed = await parsePlan(rawPlan);
      parsed = {
        ...parsed,
        meals: normalizeGeneratedMeals(parsed.meals, householdSize),
      };
      blockedMatches = findBlockedContentMatches(
        [...parsed.meals, ...parsed.breakfasts, ...parsed.lunches,...parsed.desserts.map(d=>({...d,name:d.title,notes:d.description,day:"Dessert"}))],
        [...dietaryPreferences.blockedIngredients, ...avoidanceGuidance.avoidedItems],
      ).concat(allergyConflicts(parsed, diet));
      repeatedSignatureWords = findRepeatedSignatureTitleWords(parsed.meals);
      equipmentViolations = findEquipmentViolations([...parsed.meals, ...parsed.breakfasts, ...parsed.lunches,...parsed.desserts.map(d=>({...d,name:d.title,notes:d.description,day:"Dessert"}))], selectedEquipmentSet);
      missingSelectedEquipmentUsage = findMissingSelectedEquipmentUsage(
        parsed.meals,
        selectedEquipmentSet,
      );
      overusedProteins = normalizedMealSourceMode === "pantry-only" ? [] : findOverusedProteins(parsed.meals);
      repeatedMealFamilies = findRepeatedMealFamilies(parsed.meals);
      cuisineAlignedMeals = countCuisineAlignedMeals(parsed.meals, cuisinePreference);
    }

    if (
      isPlusGeneration &&
      (
        culinaryReview(parsed,normalizedMealSourceMode === "pantry-only").issues.length > 0 ||
        (normalizedMealSourceMode !== "pantry-only" && repeatedSignatureWords.length > 0) ||
        (normalizedMealSourceMode !== "pantry-only" && missingSelectedEquipmentUsage.length > 0) ||
        overusedProteins.length > 0 ||
        (normalizedMealSourceMode !== "pantry-only" && repeatedMealFamilies.length > 0) ||
        (Boolean(cuisinePreference?.trim()) && cuisineAlignedMeals < 3 && normalizedMealSourceMode !== "pantry-only")
      )
    ) {
      rawPlan = await requestMealPlan(
        `PLUS REFINEMENT RETRY: ${culinaryReview(parsed,normalizedMealSourceMode === "pantry-only").issues.join("; ")} Keep the same budget, diet, pantry, and prep-time constraints, but improve the weekly plan quality. Fix these soft-quality issues: missing selected special equipment usage: ${missingSelectedEquipmentUsage.join(", ") || "none"}. Overused proteins: ${overusedProteins.join(", ") || "none"}. Repeated meal families: ${repeatedMealFamilies.join(", ") || "none"}. Cuisine alignment count for the requested cuisine vibe is currently ${cuisineAlignedMeals} out of 7 and should fit the requested cuisine when available ingredients support it; constraints outrank diversity. Return a noticeably more varied, balanced weekly plan with exactly 7 dinner meals and valid JSON only. Desserts may be 0, 1, or 2 items.`,
      );
      parsed = await parsePlan(rawPlan);
      parsed = {
        ...parsed,
        meals: normalizeGeneratedMeals(parsed.meals, householdSize),
      };
      blockedMatches = findBlockedContentMatches(
        [...parsed.meals, ...parsed.breakfasts, ...parsed.lunches,...parsed.desserts.map(d=>({...d,name:d.title,notes:d.description,day:"Dessert"}))],
        [...dietaryPreferences.blockedIngredients, ...avoidanceGuidance.avoidedItems],
      ).concat(allergyConflicts(parsed, diet));
      repeatedSignatureWords = findRepeatedSignatureTitleWords(parsed.meals);
      equipmentViolations = findEquipmentViolations([...parsed.meals, ...parsed.breakfasts, ...parsed.lunches,...parsed.desserts.map(d=>({...d,name:d.title,notes:d.description,day:"Dessert"}))], selectedEquipmentSet);
      missingSelectedEquipmentUsage = findMissingSelectedEquipmentUsage(
        parsed.meals,
        selectedEquipmentSet,
      );
      overusedProteins = normalizedMealSourceMode === "pantry-only" ? [] : findOverusedProteins(parsed.meals);
      repeatedMealFamilies = findRepeatedMealFamilies(parsed.meals);
      cuisineAlignedMeals = countCuisineAlignedMeals(parsed.meals, cuisinePreference);
    }

    const finalDishSet=()=>[...parsed.meals,...parsed.breakfasts,...parsed.lunches,...parsed.desserts.map(d=>({...d,name:d.title,notes:d.description,day:"Dessert"}))];
    const remainingHardIssues=[...planConstraintIssues(parsed,constraintInput),...equipmentViolations,...blockedMatches];
    if(remainingHardIssues.length && providerCalls<3) {
      rawPlan=await requestMealPlan("FINAL CONSTRAINT CORRECTION: "+remainingHardIssues.join("; ")+". Do not relax constraints. No blender means no blended or pureed components; choose a recipe using the selected hardware. Preserve actual dish quality, descriptions and positive ingredient prices.");
      parsed=await parsePlan(rawPlan);parsed={...parsed,meals:normalizeGeneratedMeals(parsed.meals,householdSize)};
      blockedMatches=findBlockedContentMatches(finalDishSet(),[...dietaryPreferences.blockedIngredients,...avoidanceGuidance.avoidedItems]).concat(allergyConflicts(parsed,diet));
      equipmentViolations=findEquipmentViolations(finalDishSet(),selectedEquipmentSet);
    }
    constraintIssues = planConstraintIssues(parsed,constraintInput);
    if (constraintIssues.length) return NextResponse.json({error:"The plan could not meet your constraints. "+constraintIssues.join(" "),retryable:false},{status:422});
    if (blockedMatches.length > 0) {
      return NextResponse.json(
        {
          error: `Generated meals violated dietary restrictions or explicit avoid rules by including blocked terms: ${Array.from(new Set(blockedMatches)).join(", ")}`,
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

    const optionalMeals = [
      ...normalizeOptionalMeals(includeBreakfast ? parsed.breakfasts : [], "breakfast", householdSize),
      ...normalizeOptionalMeals(includeLunch ? parsed.lunches : [], "lunch", householdSize),
    ];
    if ((includeBreakfast && parsed.breakfasts.length !== 3) || (includeLunch && parsed.lunches.length !== 3)) {
      throw new Error("The plan did not include all requested breakfast or lunch options. Please try again.");
    }
    const optionalBlocked = findBlockedContentMatches(optionalMeals, [...dietaryPreferences.blockedIngredients, ...avoidanceGuidance.avoidedItems]);
    const optionalEquipment = findEquipmentViolations(optionalMeals, selectedEquipmentSet);
    if (optionalBlocked.length || optionalEquipment.length) {
      throw new Error("Breakfast or lunch options did not meet your dietary, avoidance, or equipment settings. Please try again.");
    }
    const allMeals = [...parsed.meals, ...optionalMeals].map(meal=>({...meal,dietaryRestrictions:diet}));

    const deterministicRestockItems = (
      normalizedMealSourceMode === "pantry-only"
        ? []
        : Array.isArray(restock)
          ? restock
          : []
    )
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        category: "Restock",
        item: `${item} [RESTOCK]`,
        estimated_price: Math.max(1, estimateRestockPrice(item)),
      }));

    const recalculatedTotal =
      allMeals.reduce(
        (sum, meal) =>
          sum +
          meal.ingredients.reduce(
            (ingredientSum, ingredient) =>
              ingredientSum + ingredient.price,
            0,
          ),
        0,
      ) +
      parsed.desserts.reduce((sum,dessert)=>sum+dessert.ingredients.reduce((s,i)=>s+i.price,0),0) +
      deterministicRestockItems.reduce(
        (sum, item) => sum + item.estimated_price,
        0,
      );

    if (normalizedMealSourceMode !== "pantry-only" && recalculatedTotal > budget+0.01) return NextResponse.json({error:"The estimated plan including desserts and restock exceeds your budget. No plan was saved.",retryable:false},{status:422});
    const candidateFailure=candidateOutputResponse({diet,avoidIngredients},{...parsed,restock_items:deterministicRestockItems});if(candidateFailure)return candidateFailure;
    const dietarySafety = assessDiet({ ...parsed, restock_items: deterministicRestockItems }, diet);
    if (dietarySafety.conflicts.length) return NextResponse.json({ error: "Known allergy conflict detected. Generate a new plan; no rejected plan was saved.", dietarySafety }, { status: 422 });
    return NextResponse.json({
      dietarySafety,
      ...parsed,
      meals: allMeals,
      breakfasts: includeBreakfast ? parsed.breakfasts : [],
      lunches: includeLunch ? parsed.lunches : [],
      restock_items: deterministicRestockItems,
      estimated_total_cost: recalculatedTotal,
      desserts: parsed.desserts.map(d=>({...d,dietaryRestrictions:diet})),
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

    const providerError = error as { status?: number; code?: string; headers?: Record<string, string> };
    const retryable = (providerError.status === 429 && providerError.code !== "insufficient_quota") || providerError.status === 503;
    if (retryable) {
      const hint = providerError.headers?.["retry-after"];
      const seconds = hint ? Number(hint) || Math.ceil((Date.parse(hint)-Date.now())/1000) : 30;
      return NextResponse.json({ error: "MealCaddie is busy. Your plan will try again shortly.", retryable: true },
        { status: 503, headers: { "Retry-After": String(Math.max(30, Number.isFinite(seconds) ? seconds : 30)) } });
    }
    return NextResponse.json({ error: "We couldn't finish this plan. Please try a new plan." }, { status: 500 });
  }
}
