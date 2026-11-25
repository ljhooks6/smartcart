import { candidateOutputResponse } from "@/lib/food-safety-response";
import { foodSafetyResponse } from "@/lib/food-safety-response";
import { requireProductAccess } from "@/lib/product-access";
import { requireAgreements } from "@/lib/legal-agreements";
import { mergeDietaryEntries } from "@/lib/dietary-safety";
import { assessDiet } from "@/lib/dietary-safety";
import OpenAI from "openai";
import { pilotAIBudget } from "@/lib/beta-pilot-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { formatRecipeIngredients } from "@/lib/recipe-ingredients";
import { getRequestMembership } from "@/lib/server-membership";
import { ingredientViolations, recipeViolations } from "@/lib/ai-food-constraints";
import { generateValidatedFood } from "@/lib/validated-food-generation";
import {pantryActionSchema,pantryRecipeProblems,renderPantryActions,pantryRecipeStockProblems} from "@/lib/pantry-recipe-contract";
import {pantryQuantityProblem} from "@/lib/pantry-plan-quantities";

export const maxDuration = 150;

const recipeRequestSchema = z.object({
  mealTitle: z.string().trim().min(1),
  mealNotes: z.string().max(10000).optional(),
  diet: z.string().max(6000).optional(),
  originalDietaryRestrictions: z.string().max(6000).optional(),
  avoidIngredients: z.string().max(2000).optional(),
  availableEquipment: z.array(z.string().max(100)).max(20).optional(),
  servings: z.number().int().positive().optional(),
  pantryOnly:z.boolean().optional(),
  pantryPlanId:z.string().min(1).max(180).optional(),
  maximumMinutes:z.number().int().min(1).max(240).optional(),
  pantryInventory:z.array(z.object({name:z.string().min(1).max(150),quantity:z.number().finite().min(0).max(1000000).optional(),unit:z.string().max(30).optional(),status:z.enum(["owned","stocked","low","restock"])})).max(200).optional(),
  ingredients: z.array(z.object({
    name: z.string().trim().min(1),
    amount: z.string().trim().min(1),
  })).min(1).max(200).optional(),
});

const recipeResponseSchema = z.object({
  title: z.string().min(1),
  prep_time_minutes: z.number().int().positive(),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(3),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 60000,
});

export async function POST(request: Request) {
  const productResponse = await requireProductAccess(request); if (productResponse) return productResponse;
  const legalResponse = await requireAgreements(request); if (legalResponse) return legalResponse;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const requestResult = recipeRequestSchema.safeParse(body);
  if (!requestResult.success) {
    return NextResponse.json(
      { error: "Provide a meal title, valid servings, and ingredient names with amounts when supplied." },
      { status: 400 },
    );
  }
  const { mealTitle, mealNotes, servings, ingredients, diet: currentDiet, avoidIngredients, availableEquipment } = requestResult.data;
  const diet=mergeDietaryEntries(currentDiet || "",requestResult.data.originalDietaryRestrictions);
  const membership = await getRequestMembership(request);
  if ("status" in membership) return NextResponse.json({ error: membership.error }, { status: membership.status });
  const pilotBudget = await pilotAIBudget(body); if (pilotBudget) return pilotBudget;
  const safetyResponse = foodSafetyResponse({diet,avoidIngredients},true);if(safetyResponse)return safetyResponse;
  const preferences = { diet, avoidIngredients, availableEquipment };
  if (ingredients && ingredientViolations(ingredients.map(i => i.name), preferences).length) return NextResponse.json({ error: "This saved meal conflicts with your current dietary preferences. Replace the meal or update your preferences first." }, { status: 422 });
  const ingredientLines = ingredients ? formatRecipeIngredients(ingredients) : undefined;
  if(requestResult.data.pantryOnly){
    const {pantryInventory,pantryPlanId,maximumMinutes}=requestResult.data;
    if(!ingredients||!servings||!pantryPlanId||!maximumMinutes||!pantryInventory?.length)return NextResponse.json({error:"Review and confirm the current pantry and original plan before opening this Pantry Only recipe."},{status:422});
    const inventory={mealSourceMode:"pantry-only",combinedPantryItems:pantryInventory.map(i=>i.name).join(", "),pantryInventory};
    const problem=pantryQuantityProblem(inventory),stock=pantryRecipeStockProblems(ingredients,inventory);
    if(problem||stock.length)return NextResponse.json({error:problem||stock.join(" ")},{status:422});
    try{
      const parsed=await generateValidatedFood(openai,{
        model:membership.plan==="plus"?"gpt-6.1-sol":"gpt-6-luna",
        system:'Return JSON only with prep_time_minutes and actions. Each action is a strict object {action,ingredientIds,minutes}. Allowed actions: chop, heat, saute, mix, simmer, rest, serve. Reference only the zero-based ingredient IDs supplied. No prose, ingredients, substitutions, side dishes or extra fields. Use every ingredient in saute/mix/simmer; finish with serve. Repeated references mean the same measured food, never another addition. Dry rice needs a timed simmer with listed water. Respect original forms, household size, selected equipment and maximum elapsed time. Do not understate cooking time.',
        user:JSON.stringify({mealTitle,ingredients:ingredients.map((i,id)=>({id,...i})),servings,availableEquipment,maximumMinutes}),
        parse:value=>pantryActionSchema.parse(value),
        validate:value=>pantryRecipeProblems(value,ingredients,maximumMinutes,availableEquipment??[]),
      });
      const output={title:mealTitle,prep_time_minutes:parsed.prep_time_minutes,ingredients:ingredientLines!,steps:renderPantryActions(parsed,ingredients,servings),pantryContractVersion:1,dietarySafety:assessDiet(ingredientLines,diet)};
      if(recipeViolations(output,ingredients,preferences).length)return NextResponse.json({error:"Cooking instructions did not pass the existing food and equipment checks."},{status:422});
      const candidateFailure=candidateOutputResponse({diet,avoidIngredients},output);if(candidateFailure)return candidateFailure;
      return NextResponse.json(output);
    }catch{return NextResponse.json({error:"The Pantry Only cooking actions could not be verified against the measured ingredients, forms, equipment and time. No unverified instructions were returned."},{status:422});}
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing." },
      { status: 500 },
    );
  }

  const systemPrompt = `
You are a precise weeknight recipe writer.
Create a fast, easy, appetizing recipe for a single dinner from a meal plan.

Rules:
- Return valid JSON only.
- Keep the recipe practical for home cooks.
- Include one realistic prep time in minutes.
- Include a concise ingredient list.
- Include clear, step-by-step instructions.
- Obey the diet, ingredient exclusions, and available equipment. Do not offer alternatives needing unavailable appliances.
- For raw chicken or turkey, include an internal thermometer check of 165°F/74°C; color alone is not a doneness check.
- Keep the recipe aligned with the given meal title and notes.
- When planned ingredients are provided, they are the complete source of truth for the recipe. Use their exact names, types, and quantities, including every planned side. Do not add ingredients, substitute varieties, or change quantities. Only water may be used without an ingredient entry. Write steps using this same list.
- Do not suggest optional garnishes or extra amounts beyond the planned list. If garnishing, reserve part of the listed amount and explain that in the steps.
- Use this exact JSON shape:
{
  "title": "string",
  "prep_time_minutes": number,
  "ingredients": ["string"],
  "steps": ["string"]
}
`;

  const userPrompt = `
Meal title: ${mealTitle}
Meal notes: ${mealNotes?.trim() || "None provided"}
Diet: ${diet || "No preference"}
Excluded ingredients: ${avoidIngredients || "None"}
Available equipment: ${availableEquipment?.join(", ") ?? "Oven, Stovetop, Microwave"}
Servings: ${typeof servings === "number" ? servings : "Use a reasonable default"}
Planned ingredients: ${ingredientLines ? JSON.stringify(ingredientLines) : "No stored ingredient list; create a practical recipe."}
`;

  try {
    const parsed = await generateValidatedFood(openai, {
      model: membership.plan === "plus" ? "gpt-6.1-sol" : "gpt-6-luna",
      system: systemPrompt.trim(), user: userPrompt.trim(),
      parse: value => recipeResponseSchema.parse(value),
      validate: value => recipeViolations(value, ingredients, preferences),
    });
    const candidateFailure=candidateOutputResponse({diet,avoidIngredients},{...parsed,ingredients:ingredientLines ?? parsed.ingredients});if(candidateFailure)return candidateFailure;
    return NextResponse.json({
      dietarySafety: assessDiet([...parsed.ingredients, ...parsed.steps], diet),
      ...parsed,
      // Preserve the stored plan exactly, even if the model rewrites its list.
      ingredients: ingredientLines ?? parsed.ingredients,
    });
  } catch {
    return NextResponse.json({ error: "We couldn't create a recipe that meets your preferences. Please try again." }, { status: 502 });
  }
}
