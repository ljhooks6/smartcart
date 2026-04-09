import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

type GenerateListRequest = {
  budget: number;
  diet: string;
  householdSize: number;
  combinedPantryItems: string;
  mustHaveIngredient?: string;
  includeDessert?: boolean;
  apply_upgrades?: boolean;
};

const mealSchema = z.object({
  day: z.string().min(1),
  name: z.string().min(1),
  servings: z.number().int().positive(),
  notes: z.string().min(1),
});

const groceryItemSchema = z.object({
  category: z.string().min(1),
  item: z.string().min(1),
  estimated_price: z.number().nonnegative(),
});

const dessertSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const generateListResponseSchema = z.object({
  meals: z.array(mealSchema).length(5),
  grocery_list: z.array(groceryItemSchema).min(1),
  estimated_total_cost: z.number().nonnegative(),
  budget_summary: z.string().min(1),
  upgrade_available: z.boolean(),
  dessert: dessertSchema.optional(),
});

type GenerateListResponse = z.infer<typeof generateListResponseSchema>;

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
    mustHaveIngredient,
    includeDessert,
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
- If includeDessert is true, evaluate the remaining budget after planning the 5 main meals. If there is room, generate exactly ONE dessert recipe for the week. Prioritize utilizing the user's pantry baking staples to keep costs low and add any missing items to the grocery list. If the budget is too tight to afford the 5 meals AND a dessert, omit the dessert entirely.
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
  }
}
`;

  const userPrompt = `
Build a 5-day meal plan and grocery list with these inputs:

Budget: ${budget}
Diet: ${diet}
Household Size: ${householdSize}
Pantry Items: ${combinedPantryItems || "None provided"}
Must-Have Ingredient: ${mustHaveIngredient?.trim() || "None provided"}
Include Dessert: ${includeDessert ? "Yes" : "No"}

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
