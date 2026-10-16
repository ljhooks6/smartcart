import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { catalogVersion } from "./allergy-aware-catalog";
import { allergyPlanInputSchema, createAllergyAwarePlan, reopenAllergyAwarePlan, replaceAllergyAwareRecipe, reviewAllergyGroceryList, type ReviewedPlan } from "./allergy-aware-planner";
import { assertPilotScope, authorizeLocalLibrary, localLibraryEnabled } from "./allergy-library-local";
import { canonical, LibraryError, signLibraryPlan, verifyLibraryPlan, type LocalSigningKeys } from "./allergy-library-provenance";
import { claimGenerationJob, finishGenerationJob, readGenerationJob, reserveGenerationJob, type StoredGenerationJob } from "./generation-jobs";
import { recentGenerationMeals } from "./generation-meal-history";
import { operationAllowed } from "./beta-onboarding-domain";

const diet=z.string().min(1).max(6000),token=z.string().min(1).max(20000),id=z.string().uuid();
const current={currentDiet:diet,avoidIngredients:z.string().max(2000).optional()};
export const libraryCommandSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("generate"),requestKey:id,input:allergyPlanInputSchema,rejected:z.array(z.string().max(180)).max(12).default([])}).strict(),
  z.object({action:z.literal("job"),id,...current}).strict(),
  z.object({action:z.literal("save-vault"),provenance:token,recipeId:z.string().max(80),...current}).strict(),
  z.object({action:z.literal("save-week"),provenance:token,...current}).strict(),
  z.object({action:z.literal("open"),table:z.enum(["vault","week"]),id,...current}).strict(),
  z.object({action:z.literal("replace"),provenance:token,slot:z.number().int().min(0).max(7),recipeId:z.string().max(80),...current}).strict(),
  z.object({action:z.literal("groceries"),provenance:token,proposed:z.unknown(),...current}).strict(),
]);
type Context={admin:SupabaseClient;user:SupabaseClient;userId:string;allowlist:readonly string[];keys:LocalSigningKeys};
const jsonValue=(value:unknown)=>JSON.parse(JSON.stringify(value));
function validPlan(result:ReturnType<typeof createAllergyAwarePlan>):ReviewedPlan {
  if(!result.ok)throw new LibraryError(result.findings[0]?.code??"CONSTRAINTS_UNMET",422,result.findings.map(f=>f.message).join(" "));
  return result.plan;
}
function restored(provenance:unknown,currentDiet:string,avoid:string|undefined,c:Context){
  const payload=verifyLibraryPlan(provenance,c.userId,c.keys);
  assertPilotScope({diet:currentDiet,originalDietaryRestrictions:payload.input.diet,avoidIngredients:[payload.input.avoidIngredients,avoid].filter(Boolean).join(", ")});
  const plan=validPlan(reopenAllergyAwarePlan({schemaVersion:1,catalogVersion,input:payload.input},currentDiet,avoid));
  return {payload,plan};
}
function mealRecord(plan:ReviewedPlan,recipeId:string,provenance:string,userId:string){
  const meal=plan.meals.find(m=>m.id===recipeId);if(!meal)throw new LibraryError("RECIPE_UNKNOWN",422,"Choose a recipe included in this signed plan.");
  return {...meal,dietaryRestrictions:plan.policy.originalEntry,library:{schemaVersion:1,provenance,recipeId,
    cacheKey:createHash("sha256").update(canonical([userId,provenance,recipeId,plan.policy.originalEntry,plan.policy.avoidedFoodIds])).digest("hex")}};
}
function recordId(owner:string,provenance:string,recipeId:string){
  const hash=createHash("sha256").update(canonical([owner,provenance,recipeId])).digest("hex");
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
async function authorize(c:Context){
  if(!localLibraryEnabled())throw new LibraryError("NOT_FOUND",404,"Not found");
  return authorizeLocalLibrary(c.admin,c.userId,c.allowlist);
}
export async function processLibraryJob(jobId:string,c:Context){
  // Same service-only reservation/lease/fencing/finish functions as ordinary jobs.
  // This local path never dispatches a provider request or Vercel queue.
  if(!localLibraryEnabled())throw new LibraryError("NOT_FOUND",404,"Not found");
  await ownedJob(jobId,c);
  const claim=await claimGenerationJob(jobId,c.admin);
  if(claim.code==="busy")throw new LibraryError("JOB_BUSY",409,"This plan is already running. Reopen the same request shortly.");
  if(!claim.job)return;
  const job=claim.job;
  try{
    if(job.user_id!==c.userId||job.owner_key!==`user:${c.userId}`)throw new LibraryError("OWNER",403,"The job belongs to a different account.");
    const plan=await authorize(c);
    if(!operationAllowed(job.plan,plan))throw new LibraryError("ACCESS_CHANGED",403,"Plus access changed. The unused reservation was released; existing content is preserved.");
    const stored=job.input as typeof job.input&{allergyLibrary?:{mode:string;catalog:string;input:unknown}};
    if(stored.allergyLibrary?.mode!=="allergy-library-v1"||stored.allergyLibrary.catalog!==catalogVersion)throw new LibraryError("VERSION",422,"This job needs the current candidate catalog.");
    const input=allergyPlanInputSchema.parse(stored.allergyLibrary.input);
    if(input.count!==7||input.selectedRecipeIds)throw new LibraryError("PLAN_COUNT",422,"A new library plan must select seven dinners.");
    assertPilotScope(input);
    const history=await recentGenerationMeals(job,c.admin,true);
    const rejected=[...new Set([...(stored.recentRejectedMeals??[]),...(history.recentRejectedMeals??[])])].slice(0,12);
    const generated=validPlan(createAllergyAwarePlan(input,{seed:job.id,recentPlans:history.recentPlans,rejected}));
    const refreshed=await authorize(c);
    if(!operationAllowed(job.plan,refreshed))throw new LibraryError("ACCESS_CHANGED",403,"Access changed before completion; the result was withheld.");
    const provenance=signLibraryPlan(generated,c.userId,randomUUID(),job.id,c.keys);
    const result={mode:"allergy-library-v1",meals:generated.meals.filter(m=>m.kind==="dinner"),desserts:generated.meals.filter(m=>m.kind==="dessert"),plan:generated,provenance};
    await finishGenerationJob(job,"completed",result,null,[],0,c.admin);
  }catch(error){
    await finishGenerationJob(job,"failed",null,error instanceof LibraryError?error.message:"Local library planning could not finish. The unused allowance was released.",[],0,c.admin);
  }
}
async function ownedJob(id:string,c:Context){
  const job=await readGenerationJob(`user:${c.userId}`,id,c.admin);
  if(!job||job.user_id!==c.userId)throw new LibraryError("NOT_FOUND",404,"Planning request not found.");
  return job;
}
function jobResponse(job:StoredGenerationJob,currentDiet:string,avoid:string|undefined,c:Context){
  if(job.status!=="completed")return {job:{id:job.id,status:job.status,error:job.error}};
  const result=job.result as {provenance?:unknown}|null;
  const checked=restored(result?.provenance,currentDiet,avoid,c);
  return {job:{id:job.id,status:job.status,error:null},plan:checked.plan,provenance:result?.provenance};
}
export async function executeLibraryCommand(raw:unknown,c:Context){
  const parsed=libraryCommandSchema.safeParse(raw);if(!parsed.success)throw new LibraryError("REQUEST_INVALID",400,"Use the supported local library operation and complete fields.");
  const command=parsed.data,plan=await authorize(c);
  if(command.action==="generate"){
    if(command.input.count!==7||command.input.selectedRecipeIds)throw new LibraryError("PLAN_COUNT",422,"A new plan selects seven dinners; replacement and saved reads do not use another plan allowance.");
    assertPilotScope(command.input);
    const input={budget:command.input.budget,diet:command.input.diet,householdSize:command.input.householdSize,combinedPantryItems:"",availableEquipment:command.input.availableEquipment,
      recentRejectedMeals:command.rejected,allergyLibrary:{mode:"allergy-library-v1",catalog:catalogVersion,input:command.input}};
    const reservation=await reserveGenerationJob({owner:`user:${c.userId}`,quota:`user:${c.userId}`,userId:c.userId,plan},command.requestKey,input,c.admin);
    if(reservation.code)throw new LibraryError(reservation.code,reservation.code==="conflict"?409:429,reservation.code==="limit"?`Your existing ${plan==="plus"?20:5} weekly plan allowance is used. Saved content remains available.`:"This planning request cannot start yet. Retry the same request without changing its inputs.");
    if(!reservation.job)throw new LibraryError("JOB_UNAVAILABLE",503,"Local planning storage is unavailable.");
    if(reservation.job.status==="queued")await processLibraryJob(reservation.job.id,c);
    return {...jobResponse(await ownedJob(reservation.job.id,c),command.input.diet,command.input.avoidIngredients,c),reused:!!reservation.reused,remaining:reservation.remaining};
  }
  assertPilotScope({diet:command.currentDiet,avoidIngredients:command.avoidIngredients});
  if(command.action==="job")return jobResponse(await ownedJob(command.id,c),command.currentDiet,command.avoidIngredients,c);
  if(command.action==="open"){
    const table=command.table==="vault"?"archived_meals":"weekly_menus";
    const row=await c.user.from(table).select("id,user_id,recipe_data").eq("id",command.id).eq("user_id",c.userId).maybeSingle();
    if(row.error)throw new LibraryError("STORAGE",503,"Saved content could not be read.");
    if(!row.data||row.data.user_id!==c.userId)throw new LibraryError("NOT_FOUND",404,"Saved recipe not found.");
    const envelope=row.data.recipe_data?.library;
    if(!envelope)throw new LibraryError("HISTORICAL_UNCHECKED",409,"Historical content is preserved and has not been converted to an ingredient-source checked recipe.");
    const checked=restored(envelope.provenance,command.currentDiet,command.avoidIngredients,c);
    return {plan:checked.plan,recipe:mealRecord(checked.plan,envelope.recipeId,envelope.provenance,c.userId),provenance:envelope.provenance};
  }
  const checked=restored(command.provenance,command.currentDiet,command.avoidIngredients,c);
  if(command.action==="groceries")return {plan:validPlan(reviewAllergyGroceryList(command.proposed,checked.plan.snapshot,command.currentDiet))};
  if(command.action==="replace"){
    const replaced=validPlan(replaceAllergyAwareRecipe(checked.plan.snapshot,command.currentDiet,command.slot,command.recipeId));
    const provenance=signLibraryPlan(replaced,c.userId,randomUUID(),checked.payload.job,c.keys);
    return {plan:replaced,provenance};
  }
  if(command.action==="save-vault"){
    const recipe=mealRecord(checked.plan,command.recipeId,command.provenance,c.userId),id=recordId(c.userId,command.provenance,command.recipeId);
    // Use authenticated RLS + existing database cap triggers, NOT service-role writes.
    const saved=await c.user.from("archived_meals").upsert({id,user_id:c.userId,name:recipe.name,ingredients:jsonValue(recipe.ingredients),instructions:recipe.steps,recipe_data:jsonValue(recipe)},{onConflict:"id"});
    if(saved.error)throw new LibraryError("VAULT_SAVE",409,"The recipe could not be saved. Your existing Vault ownership and Free/Plus limits still apply.");
    return {saved:true,id};
  }
  const meals=checked.plan.meals.map(meal=>({user_id:c.userId,meal_title:meal.name,type:meal.kind,recipe_data:mealRecord(checked.plan,meal.id,command.provenance,c.userId)}));
  const saved=await c.user.rpc("save_mealcaddie_week",{meals:jsonValue(meals),pantry:null});
  if(saved.error)throw new LibraryError("WEEK_SAVE",409,"The week could not be saved. Existing content is unchanged.");
  return {saved:true};
}
