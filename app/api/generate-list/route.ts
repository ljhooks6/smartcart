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
};

const mealSchema = z.object({
  day: z.string().min(1),
  name: z.string().min(1),
  servings: z.number().int().positive(),
  notes: z.string().min(1),
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
  imageUrl: z.string().url().optional(),
});

const generateListResponseSchema = z.object({
  meals: z.array(mealSchema).length(5),
  grocery_list: z.array(groceryItemSchema).min(1),
  estimated_total_cost: z.number().nonnegative(),
  budget_summary: z.string().min(1),
  upgrade_available: z.boolean(),
  dessert: dessertSchema.nullable().optional(),
});

type GenerateListResponse = z.infer<typeof generateListResponseSchema>;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MEAL_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80";

async function fetchUnsplashImage(query: string, queryIsEncoded = false) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return DEFAULT_MEAL_IMAGE;
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
      return DEFAULT_MEAL_IMAGE;
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
      return DEFAULT_MEAL_IMAGE;
    }

    const imageUrl =
      data.results[0]?.urls?.regular ?? data.results[0]?.urls?.small;

    return imageUrl || DEFAULT_MEAL_IMAGE;
  } catch {
    return DEFAULT_MEAL_IMAGE;
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
Create a 5-day meal plan and grocery list that strictly adheres to the user's budget, diet, household size, and pantry items.

Rules:
- Always generate a lean, frugal list first unless the user explicitly asks to apply upgrades.
- Return exactly 5 meals, one for each day in the 5-day plan.
- Respect the budget strictly.
- Respect the diet exactly.
- Reuse pantry items whenever possible.
- Use pantry items from the "fully stocked", "running low", and "restock" lists to shape the meals.
- The grocery_list should only contain ingredients required for the meals and dessert you generate.
- CRITICAL: If an ingredient is included in the user's pantryItems list, it MUST NOT be included in the generated groceryList array. The user already owns these items. You must strictly filter out pantry items from the final shopping list and estimated total.
- Adventure Level enforcement: if the user selected "Try new cuisines" or "Mix it up", you MUST generate diverse, global, or creative recipes and strictly avoid generic fallbacks like "Vegetable Stir-fry", plain pasta, or repetitive default meals. If the user selected "Stick to basics", keep the meals familiar and approachable.
- CRITICAL: You must strictly tailor the cuisine types to the user's adventureLevel preference.
- If Stick to basics: Generate classic, familiar comfort foods. You MUST prioritize styles like Soul Food, classic BBQ, traditional American fare (for example burgers and fries, pork chops), and simple homestyle meals. STRICTLY avoid trendy bowls or complex international dishes.
- If Mix it up: Provide a balanced 50/50 split. Include some hearty homestyle comfort food alongside approachable global dishes.
- If Try new cuisines: Focus entirely on diverse, authentic global flavors (for example Mediterranean, Asian, Indian, regional Mexican).
- Budget Tightness enforcement: if budgetTightness is false, you MUST NOT force heavy ingredient overlap. Prioritize culinary variety, distinct flavor profiles, and different lead ingredients across the week. Only force strong cross-utilization and ingredient overlap if budgetTightness is true.
- If budgetTightness is false, you MUST utilize between 50% and 65% of the user's total budget. Do not go below 50% of the budget. You must select premium, high-quality ingredients to hit this minimum threshold. Do not exceed 65% of the total budget.
- CRITICAL: When budgetTightness is false, you MUST perform a mathematical check before responding. The total sum of all items in the groceryList MUST fall between 50% and 65% of the user's total budget. If your total is below 50%, you must upgrade to premium ingredients or upscale the recipes until you hit that 50% minimum threshold.
- If includeDessert is true, evaluate the remaining budget after planning the 5 main meals. If there is room, generate exactly ONE dessert recipe for the week. Prioritize utilizing the user's pantry baking staples to keep costs low and add any missing items to the grocery list. If the budget is too tight to afford the 5 meals AND a dessert, set "dessert" to null.
- If a must_have_ingredient is provided, you MUST feature it prominently in AT LEAST ONE, but strictly NO MORE THAN TWO of the 5 meals. You must ensure the remaining meals use completely different flavor profiles and main ingredients to provide variety and prevent ingredient fatigue.
- Strict Consistency: Every single item in the grocery_list must be explicitly used in the name or notes of at least one meal in the meals array. Do not include any grocery item that is not required by the generated meals.
- The grocery_list must be organized by category. Every grocery item must include a "category" field such as "Produce", "Meat/Seafood", "Dairy", or "Center Aisle".
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
      "notes": "string"
    }
  ],
  "grocery_list": [
    {
      "category": "Produce",
      "item": "string",
      "estimated_price": number
    }
  ],
  "estimated_total_cost": number,
  "budget_summary": "string",
  "upgrade_available": boolean,
  "dessert": {
    "title": "string",
    "description": "string"
  } | null
}
`;

  const userPrompt = `
Build a 5-day meal plan and grocery list with these inputs:

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

    const parsed = generateListResponseSchema.parse(JSON.parse(content));

    const pantryTokens = [
      ...(Array.isArray(fullyStocked) ? fullyStocked : []),
      ...(Array.isArray(runningLow) ? runningLow : []),
    ]
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const filteredGroceryList = parsed.grocery_list.filter((item) => {
      const itemName = item.item.trim().toLowerCase();
      return !pantryTokens.some(
        (token) => itemName.includes(token) || token.includes(itemName),
      );
    });

    const deterministicRestockItems = (Array.isArray(restock) ? restock : [])
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        category: "Restock",
        item: `${item} [RESTOCK]`,
        estimated_price: 3,
      }));

    const finalGroceryList = [
      ...filteredGroceryList,
      ...deterministicRestockItems,
    ];

    const recalculatedTotal = finalGroceryList.reduce(
      (sum, item) => sum + item.estimated_price,
      0,
    );

    const dessertQuery = parsed.dessert
      ? encodeURIComponent(`${parsed.dessert.title} dessert`)
      : "";
    const [mealImages, dessertImage] = await Promise.all([
      Promise.all(parsed.meals.map((meal) => fetchUnsplashImage(meal.name))),
      parsed.dessert
        ? fetchUnsplashImage(dessertQuery, true)
        : Promise.resolve(""),
    ]);

    const mealsWithImages = parsed.meals.map((meal, index) => ({
      ...meal,
      imageUrl: mealImages[index],
    }));

    const dessertWithImage = parsed.dessert
      ? { ...parsed.dessert, imageUrl: dessertImage || DEFAULT_MEAL_IMAGE }
      : parsed.dessert;

    return NextResponse.json({
      ...parsed,
      meals: mealsWithImages,
      grocery_list: finalGroceryList,
      estimated_total_cost: recalculatedTotal,
      dessert: dessertWithImage,
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
