import { foodSafetyResponse } from "@/lib/food-safety-response";
import { requireProductAccess } from "@/lib/product-access";
import { requireAgreements } from "@/lib/legal-agreements";
import { assessDiet } from "@/lib/dietary-safety";
import OpenAI from "openai";
import { pilotAIBudget } from "@/lib/beta-pilot-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestMembership } from "@/lib/server-membership";
import { equipmentViolations, ingredientViolations, pantryViolations } from "@/lib/ai-food-constraints";
import { generateValidatedFood } from "@/lib/validated-food-generation";

export const maxDuration = 150;
const requestSchema = z.object({
  rejectedDessertTitle: z.string().trim().min(1).max(500), budget: z.number().finite().positive(),
  diet: z.string().max(6000).optional(), householdSize: z.number().int().positive().max(50).optional(),
  combinedPantryItems: z.string().max(15000).default(""),
  mealSourceMode: z.enum(["pantry-and-store", "pantry-only"]).default("pantry-and-store"),
  avoidIngredients: z.string().max(2000).optional(), availableEquipment: z.array(z.string().max(100)).max(20).optional(),
  prepTime: z.string().max(100).optional(),
});
const responseSchema = z.object({
  title: z.string().min(1), description: z.string().min(1),
  ingredients: z.array(z.object({ name: z.string().min(1), amount: z.string().min(1), price: z.number().finite().min(0.01) })).min(1).max(50),
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 60000 });

export async function POST(request: Request) {
  const productResponse = await requireProductAccess(request); if (productResponse) return productResponse;
  const legalResponse = await requireAgreements(request); if (legalResponse) return legalResponse;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const input = requestSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: "Provide a dessert title, positive budget, and valid preferences." }, { status: 400 });
  const membership = await getRequestMembership(request);
  if ("status" in membership) return NextResponse.json({ error: membership.error }, { status: membership.status });
  const pilotBudget = await pilotAIBudget(body); if (pilotBudget) return pilotBudget;
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Recipe service is unavailable." }, { status: 503 });
  const safetyResponse=foodSafetyResponse(input.data,true);if(safetyResponse)return safetyResponse;
  const data = input.data;
  const system = `You are a precise, creative dessert planner replacing one rejected dessert.
Return exactly one practical dessert for the requested household, changing category or flavor when possible. Obey diet, excluded ingredients, available equipment, and prep-time preference. Do not suggest excluded ingredients, optional additions, or unavailable appliances.
${data.mealSourceMode === "pantry-only" ? "Only use exact ingredient names from the pantry list. Water is the only permitted addition. Do not substitute varieties or add store ingredients." : "Prefer pantry ingredients; reasonable store additions are allowed."}
Amounts are quantities actually used, not rounded-up packages. Price is the estimated USD value of the amount used, NOT additional shopping cost. Every ingredient, including owned pantry ingredients, must have price >=0.01. Pantry ownership is accounted for separately in application code. Omit water from priced ingredients. Keep the estimated ingredient value within the supplied budget.
Return only JSON: {"title":"string","description":"string","ingredients":[{"name":"string","amount":"string","price":number}]}. Preserve specific food forms and dietary qualifiers.`;
  try {
    const result = await generateValidatedFood(openai, {
      model: "gpt-6-luna", system, user: JSON.stringify(data), parse: value => responseSchema.parse(value),
      validate: value => {
        const names = value.ingredients.map(i => i.name);
        return [...ingredientViolations(names, data), ...equipmentViolations(value.description, data.availableEquipment),
          ...(data.mealSourceMode === "pantry-only" ? pantryViolations(names, data.combinedPantryItems) : []),
          ...(value.title.trim().toLowerCase() === data.rejectedDessertTitle.trim().toLowerCase() ? ["Choose a different dessert"] : []),
          ...(value.ingredients.reduce((sum, i) => sum + i.price, 0) > data.budget ? ["Estimated ingredient value exceeds budget"] : [])];
      },
    });
    return NextResponse.json({ ...result, dietarySafety: assessDiet(result, data.diet) });
  } catch { return NextResponse.json({ error: "We couldn't find a treat that meets your preferences. Please try again." }, { status: 502 }); }
}
