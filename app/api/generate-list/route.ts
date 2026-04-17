import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

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
  } =
    (body as Partial<GenerateListRequest>) ?? {};

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

  const systemPrompt = `
You are an expert, budget-conscious logistical meal planner.
Create 8 meal suggestions that strictly adhere to the user's budget, diet, household size, and pantry items.

Rules:
- Always generate a lean, frugal list first unless the user explicitly asks to apply upgrades.
- Return exactly 8 meals.
- Respect the budget strictly.
- Respect the diet exactly.
- This app is for families. EVERY dinner meal MUST contain a substantial protein source such as chicken, beef, seafood, pork, tofu, or heavy beans. NEVER generate a meal that is just carbs and sauce.
- CRITICAL RULE: Stop defaulting to cheap LLM tropes like Chickpea Curry, Lentil Soup, or Bean Tacos unless the user explicitly marked those items as owned in their pantry. You must prioritize the actual proteins the user selected. Do not force legumes into the menu just to keep the budget low. Be creative with the ingredients provided.
- CRITICAL RULE: Every generated dinner MUST be a complete, balanced meal. Do not suggest standalone proteins or incomplete dishes (for example "Baked Chicken"). You must suggest fully composed plates (for example "Baked Chicken with Roasted Potatoes and Green Beans" or a complete one-pan dish like "Beef and Broccoli Stir-Fry over Rice"). If you suggest a protein, you MUST include a complementary side dish in the meal title.
- CRITICAL: Do NOT suggest, generate, or return any of the following meals: ${existingMeals?.trim() || "None provided"}.
- Reuse pantry items whenever possible.
- Use pantry items from the "fully stocked", "running low", and "restock" lists to shape the meals.
- Do not generate a root-level grocery list.
- Every meal must include its own localized "ingredients" array.
- Each ingredient object must use this exact format:
  - { "name": "Red Bell Peppers", "amount": "2", "price": 3.00 }
- Only include ingredients required for that specific meal inside that meal's ingredients array.
- You MUST be specific with ingredient names (for example "Red Bell Peppers" or "Roma Tomatoes", not just "Peppers").
- NEVER append conversational text like "(assumed purchase)" to ingredient names.
- BANNED: Any text like "1 item", "(assumed purchase)", or "to taste". If an amount is small, use "1 pinch" or "1 tsp".
- You are a professional grocery curator. You are FORBIDDEN from using generic names. You must specify types: "Red Bell Peppers", "English Cucumber", "Honeycrisp Apples", "80/20 Ground Beef". Every ingredient MUST have a realistic store-bought quantity (for example "16oz jar", "1 lb pack", "Bundle of 5").
- Write a rich, helpful 2-3 sentence description for every dinner meal and every dessert option. Do not use one-sentence descriptions.
- No ingredient or pantry item should ever be priced below $1.00. Even tiny-use items must reflect the cost of buying a standard store container.
- Adventure Level enforcement: if the user selected "Try new cuisines" or "Mix it up", you MUST generate diverse, global, or creative recipes and strictly avoid generic fallbacks like "Vegetable Stir-fry", plain pasta, or repetitive default meals. If the user selected "Stick to basics", keep the meals familiar and approachable.
- CRITICAL: You must strictly tailor the cuisine types to the user's adventureLevel preference.
- If Stick to basics: Generate classic, familiar comfort foods. You MUST prioritize styles like Soul Food, classic BBQ, traditional American fare (for example burgers and fries, pork chops), and simple homestyle meals. STRICTLY avoid trendy bowls or complex international dishes.
- If Mix it up: Provide a balanced 50/50 split. Include some hearty homestyle comfort food alongside approachable global dishes.
- If Try new cuisines: Focus entirely on diverse, authentic global flavors (for example Mediterranean, Asian, Indian, regional Mexican).
- Budget Tightness enforcement: if budgetTightness is false, you MUST NOT force heavy ingredient overlap. Prioritize culinary variety, distinct flavor profiles, and different lead ingredients across the week. Only force strong cross-utilization and ingredient overlap if budgetTightness is true.
- If budgetTightness is false, you MUST utilize between 50% and 65% of the user's total budget. Do not go below 50% of the budget. You must select premium, high-quality ingredients to hit this minimum threshold. Do not exceed 65% of the total budget.
- CRITICAL: When budgetTightness is false, you MUST perform a mathematical check before responding. The total sum of all meal ingredient prices must fall between 50% and 65% of the user's total budget. If your total is below 50%, you must upgrade to premium ingredients or upscale the recipes until you hit that 50% minimum threshold.
- If includeDessert is true, evaluate the remaining budget after planning the 8 meals. If there is room, generate exactly TWO dessert options for the week. Prioritize utilizing the user's pantry baking staples to keep costs low. If the budget is too tight to afford the 8 meals AND two dessert options, return an empty "desserts" array.
- If includeDessert is false, return an empty "desserts" array.
- Every dessert option must include its own localized "ingredients" array using the exact same ingredient format as meals.
- If a must_have_ingredient is provided, you MUST feature this exact ingredient prominently in AT LEAST 3 of the 8 dinner meals, regardless of budget.
- Strict Consistency: Every ingredient listed inside a meal's ingredients array must be explicitly used in that meal's title or notes.
- Pay close attention to the budget. If the plan is far below the target budget, use higher-quality ingredient upgrades to better maximize the budget, such as fresh herbs instead of dried herbs or a better-quality protein.
- Include a final budget note that compares the estimated total cost against the target budget.
- If the estimated total cost is less than 80% of the user's maximum budget, set "upgrade_available" to true. Otherwise set it to false.
- Return valid JSON only.
- Use this exact JSON shape:
{
  "meals": [
    {
      "day": "Day 1",
      "name": "string",
      "servings": number,
      "notes": "string",
      "ingredients": [
        {
          "name": "string",
          "amount": "string",
          "price": number
        }
      ]
    }
  ],
  "estimated_total_cost": number,
  "budget_summary": "string",
  "upgrade_available": boolean,
  "desserts": [
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
  ]
}
`;

  const userPrompt = `
Build 8 meal suggestions with localized ingredients using these inputs:

Budget: ${budget}
Diet: ${diet}
Household Size: ${householdSize}
Pantry Items: ${combinedPantryItems || "None provided"}
Fully Stocked Pantry Items: ${Array.isArray(fullyStocked) && fullyStocked.length > 0 ? fullyStocked.join(", ") : "None provided"}
Running Low Pantry Items: ${Array.isArray(runningLow) && runningLow.length > 0 ? runningLow.join(", ") : "None provided"}
Restock Pantry Items: ${Array.isArray(restock) && restock.length > 0 ? restock.join(", ") : "None provided"}
Must-Have Ingredient: ${mustHaveIngredient?.trim() || "None provided"}
Include Dessert: ${includeDessert ? "Yes" : "No"}
Adventure Level: ${adventureLevel?.trim() || "No preference provided"}
Budget Tightness: ${typeof budgetTightness === "boolean" ? (budgetTightness ? "ON" : "OFF") : "Not provided"}

${apply_upgrades
    ? "The user has chosen to upgrade. Rewrite this plan using premium, high-quality ingredients (for example fresh herbs, better proteins, organic ingredients) to get as close to the max budget as possible."
    : "Do not apply premium upgrades unless the 80% rule indicates an upgrade opportunity."}
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

    const parsed = aiGenerateListResponseSchema.parse(JSON.parse(content));

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
