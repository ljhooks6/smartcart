import { z } from "zod";
import { mergeDietaryEntries } from "./dietary-safety";
import { catalogVersion, profileById, resolveFoodName, type Unit } from "./allergy-aware-catalog";
import { buildAllergyPolicy, ingredientFindings, type AllergyPolicy, type Finding } from "./allergy-aware-policy";
import { expandRecipeParts, recipeById, reviewedRecipes, type ReviewedRecipe } from "./allergy-aware-recipes";

const pantrySchema = z.object({ name:z.string().trim().min(1).max(300), quantity:z.number().positive().max(100000), unit:z.enum(["g","ml","each"]) }).strict();
export const allergyPlanInputSchema = z.object({
  diet:z.string().min(1).max(6000), originalDietaryRestrictions:z.string().max(6000).optional(), avoidIngredients:z.string().max(2000).optional(),
  householdSize:z.number().int().min(1).max(12), budget:z.number().positive().max(10000),
  count:z.number().int().min(1).max(7).default(7), includeDessert:z.boolean().default(false),
  mealSourceMode:z.enum(["pantry-and-store","pantry-only"]).default("pantry-and-store"),
  pantry:z.array(pantrySchema).max(200).default([]),
  availableEquipment:z.array(z.enum(["Oven","Stovetop"])).min(1).max(2),
  maxMinutes:z.number().int().min(5).max(180).default(45),
  selectedRecipeIds:z.array(z.string().min(1).max(80)).max(8).optional(),
}).strict();
type PlanInput = z.infer<typeof allergyPlanInputSchema>;
type GroceryLine = { foodId:string; name:string; quantity:number; unit:Unit; estimatedCost:number };
export type ReviewedPlan = {
  status:"declared-ingredients-checked"; catalogVersion:string; recipeIds:string[];
  meals:Array<{id:string;revision:number;name:string;description:string;servings:number;minutes:number;kind:"dinner"|"dessert";ingredients:GroceryLine[];steps:string[]}>;
  groceries:GroceryLine[]; estimatedCost:number; quarantinedPantry:Finding[];
  notice:string; policy:AllergyPolicy; snapshot:{ schemaVersion:1;catalogVersion:string;input:PlanInput };
};
export type PlanResult = {ok:true;plan:ReviewedPlan} | {ok:false;findings:Finding[]};
const round = (n:number) => Math.round(n*1000)/1000;
const issue = (code:string,message:string,path="plan"):Finding => ({code,message,path});
export function recipeFindings(recipe:ReviewedRecipe, policy:AllergyPolicy) {
  return expandRecipeParts(recipe).flatMap(p=>ingredientFindings(profileById(p.foodId)!.name,policy,`recipe.${recipe.id}.${p.foodId}`));
}
function line(foodId:string,quantity:number):GroceryLine {
  const f=profileById(foodId);if(!f)throw Error("Unknown server-owned food");
  return {foodId,name:f.name,quantity:round(quantity),unit:f.unit,estimatedCost:round(quantity*f.estimatedUnitCost)};
}
function totals(recipes:readonly ReviewedRecipe[],servings:number) {
  const amounts=new Map<string,number>();
  for(const r of recipes)for(const p of expandRecipeParts(r))amounts.set(p.foodId,(amounts.get(p.foodId)??0)+p.quantity*servings);
  return amounts;
}
function preparePantry(input:PlanInput,policy:AllergyPolicy) {
  const quantities=new Map<string,number>(),quarantined:Finding[]=[];
  for(const item of input.pantry) {
    const findings=ingredientFindings(item.name,policy,"pantry"),f=resolveFoodName(item.name);
    if(findings.length||!f){quarantined.push(...findings);continue;}
    if(f.unit!==item.unit){quarantined.push(issue("PANTRY_UNIT","A pantry quantity has the wrong unit and cannot count toward available food.","pantry"));continue;}
    quantities.set(f.id,(quantities.get(f.id)??0)+item.quantity);
  }
  return {quantities,quarantined};
}
function groceriesFor(recipes:readonly ReviewedRecipe[],input:PlanInput,pantry:Map<string,number>) {
  return [...totals(recipes,input.householdSize)].map(([id,q])=>line(id,Math.max(0,q-(id==="water"?q:pantry.get(id)??0)))).filter(l=>l.quantity>0);
}
function fits(recipes:readonly ReviewedRecipe[],input:PlanInput,pantry:Map<string,number>) {
  const groceries=groceriesFor(recipes,input,pantry);
  return (input.mealSourceMode!=="pantry-only"||groceries.length===0)&&groceries.reduce((n,l)=>n+l.estimatedCost,0)<=input.budget;
}

/** Pure server module: no provider, database, identity, email or entitlement writes.
 * Future HTTP adapters MUST use authenticated owner-scoped saved records and the
 * existing feature-plan/quota checks; this module does not confer product access.
 */
export function createAllergyAwarePlan(raw:unknown):PlanResult {
  const parsed=allergyPlanInputSchema.safeParse(raw);
  if(!parsed.success)return {ok:false,findings:[issue("REQUEST_INVALID","Use valid structured restrictions, quantities, equipment and planning limits. Unknown fields are rejected.")]};
  const input=parsed.data,policy=buildAllergyPolicy(input);
  if(policy.findings.length)return {ok:false,findings:policy.findings};
  const pantry=preparePantry(input,policy);
  const eligible=reviewedRecipes.filter(r=>r.minutes<=input.maxMinutes&&input.availableEquipment.includes(r.equipment)&&!recipeFindings(r,policy).length);
  let chosen:ReviewedRecipe[]|undefined;
  if(input.selectedRecipeIds) {
    const records=input.selectedRecipeIds.map(id=>recipeById(id));
    if(new Set(input.selectedRecipeIds).size!==records.length||records.some(r=>!r))return {ok:false,findings:[issue("RECIPE_UNKNOWN","Only distinct server-owned recipe IDs can be selected. An AI description, ingredient list or verification flag cannot replace a recipe specification.")]};
    const selected=records as ReviewedRecipe[];
    const foodFindings=selected.flatMap(r=>recipeFindings(r,policy));
    if(foodFindings.length)return {ok:false,findings:foodFindings};
    if(selected.filter(r=>r.kind==="dinner").length!==input.count||selected.filter(r=>r.kind==="dessert").length!==(input.includeDessert?1:0)||selected.some(r=>!eligible.includes(r))||!fits(selected,input,pantry.quantities))return {ok:false,findings:[issue("CONSTRAINTS_UNMET","The selected recipes do not meet the requested count, pantry quantities, budget, time or equipment. No constraint was relaxed.")]};
    chosen=selected;
  } else {
    const dinners=eligible.filter(r=>r.kind==="dinner"),desserts=input.includeDessert?eligible.filter(r=>r.kind==="dessert"):[undefined];
    // Bounded local selection. No AI retry or constraint relaxation. Recipe
    // order is authored; a future rotation policy is separate from safety.
    let visited=0;
    function select(from:number,picked:ReviewedRecipe[]):boolean {
      if(++visited>20000)return false;
      if(picked.length===input.count){for(const d of desserts){const selection=d?[...picked,d]:picked;if(fits(selection,input,pantry.quantities)){chosen=selection;return true;}}return false;}
      for(let i=from;i<dinners.length;i++)if(select(i+1,[...picked,dinners[i]]))return true;
      return false;
    }
    select(0,[]);
  }
  if(!chosen)return {ok:false,findings:[issue("CONSTRAINTS_UNMET","There are not enough reviewed recipes for these restrictions and planning limits. Try fewer meals or review pantry quantities, equipment, time or budget. Keep genuine restrictions entered.")]};
  const groceries=groceriesFor(chosen,input,pantry.quantities);
  const storedInput={...input,diet:policy.originalEntry,originalDietaryRestrictions:undefined,selectedRecipeIds:chosen.map(r=>r.id)};
  const plan:ReviewedPlan={status:"declared-ingredients-checked",catalogVersion,recipeIds:chosen.map(r=>r.id),
    meals:chosen.map(r=>({id:r.id,revision:r.revision,name:r.title,description:r.description,servings:input.householdSize,minutes:r.minutes,kind:r.kind,
      ingredients:expandRecipeParts(r).map(p=>line(p.foodId,p.quantity*input.householdSize)),steps:[...r.steps]})),
    groceries,estimatedCost:round(groceries.reduce((n,l)=>n+l.estimatedCost,0)),quarantinedPantry:pantry.quarantined,
    notice:"Declared ingredient sources checked against the selected exclusions. Product formulations, labels, manufacturing, cross-contact and preparation conditions are not verified. This is not a guarantee of allergen absence. Check each actual product before cooking; do not substitute ingredients without rechecking.",
    policy,snapshot:{schemaVersion:1,catalogVersion,input:storedInput}};
  // Defense in depth after quantity aggregation; never trust a transformed name.
  const finalIssues=plan.meals.flatMap(m=>m.ingredients.flatMap(l=>ingredientFindings(l.name,policy,`render.${m.id}`))).concat(groceries.flatMap(l=>ingredientFindings(l.name,policy,"groceries")));
  return finalIssues.length?{ok:false,findings:finalIssues}:{ok:true,plan};
}

const savedSchema=z.object({schemaVersion:z.literal(1),catalogVersion:z.literal(catalogVersion),input:allergyPlanInputSchema}).strict();
/** Pass a trusted saved snapshot read by the existing owner-authorized server,
 * never a client's claimed original restrictions. Every opening recalculates
 * current+original restrictions and the current server-owned specification.
 */
export function reopenAllergyAwarePlan(saved:unknown,currentDiet:string,avoidIngredients?:string):PlanResult {
  const parsed=savedSchema.safeParse(saved);
  if(!parsed.success)return {ok:false,findings:[issue("SAVED_REVIEW_REQUIRED","This historical or changed-version recipe has not been reviewed by this catalog. Existing content is preserved; do not present it as checked.")]};
  return createAllergyAwarePlan({...parsed.data.input,diet:currentDiet,originalDietaryRestrictions:parsed.data.input.diet,
    avoidIngredients:[parsed.data.input.avoidIngredients,avoidIngredients].filter(Boolean).join(", ")});
}

export function replaceAllergyAwareRecipe(saved:unknown,currentDiet:string,slot:number,replacementId:string):PlanResult {
  const checked=reopenAllergyAwarePlan(saved,currentDiet);if(!checked.ok)return checked;
  const ids=[...checked.plan.recipeIds];
  if(!Number.isInteger(slot)||slot<0||slot>=ids.length)return {ok:false,findings:[issue("SLOT_INVALID","Choose an existing meal to replace.")]};
  ids[slot]=replacementId;
  return createAllergyAwarePlan({...checked.plan.snapshot.input,selectedRecipeIds:ids});
}

/** Re-run after a grocery-list transformation. No new foods, omissions, unknown
 * components, unit swaps or quantity changes are silently accepted. */
export function reviewAllergyGroceryList(proposed:unknown,saved:unknown,currentDiet:string) {
  const checked=reopenAllergyAwarePlan(saved,currentDiet);
  if(!checked.ok)return checked;
  const parsed=z.array(pantrySchema).max(200).safeParse(proposed);
  if(!parsed.success)return {ok:false as const,findings:[issue("GROCERY_INVALID","A complete grocery name, positive quantity and unit are required.")]};
  const found=new Map<string,number>(),findings:Finding[]=[];
  for(const item of parsed.data){findings.push(...ingredientFindings(item.name,checked.plan.policy,"groceries"));const f=resolveFoodName(item.name);if(!f)continue;if(f.unit!==item.unit)findings.push(issue("GROCERY_UNIT","A transformed grocery unit does not match its reviewed ingredient."));found.set(f.id,(found.get(f.id)??0)+item.quantity);}
  const expected=new Map(checked.plan.groceries.map(l=>[l.foodId,l.quantity]));
  if(found.size!==expected.size||[...expected].some(([id,q])=>Math.abs((found.get(id)??-1)-q)>.001))findings.push(issue("GROCERY_CHANGED","The transformed grocery list differs from the reviewed recipe requirements. Review the change before using it."));
  return findings.length?{ok:false as const,findings}:{ok:true as const,plan:checked.plan};
}

// New prototype surfaces are LOCAL ONLY, in addition to the unchanged PR #8
// production guard. Even a production/Preview flag mistake cannot open the lab.
export function allergyLabEnabled() {
  return process.env.NODE_ENV==="development"&&process.env.MEALCADDIE_ALLERGY_LAB==="true"&&!process.env.VERCEL_ENV;
}
