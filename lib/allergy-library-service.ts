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
const selection=z.array(z.object({provenance:token,recipeId:z.string().min(1).max(80),scheduledDay:z.enum(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]).optional()}).strict()).max(8);
export const libraryCommandSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("generate"),requestKey:id,input:allergyPlanInputSchema,rejected:z.array(z.string().max(180)).max(12).default([])}).strict(),
  z.object({action:z.literal("job"),id,...current}).strict(),
  z.object({action:z.literal("save-vault"),provenance:token,recipeId:z.string().max(80),...current}).strict(),
  z.object({action:z.literal("save-week"),provenance:token,...current}).strict(),
  z.object({action:z.literal("open"),table:z.enum(["vault","week"]),id,...current}).strict(),
  z.object({action:z.literal("replace"),provenance:token,slot:z.number().int().min(0).max(7),recipeId:z.string().max(80),...current}).strict(),
  z.object({action:z.literal("groceries"),provenance:token,proposed:z.unknown(),...current}).strict(),
  z.object({action:z.literal("inventory"),...current}).strict(),
  z.object({action:z.literal("recipe"),provenance:token,recipeId:z.string().max(80),...current}).strict(),
  z.object({action:z.literal("artifact"),provenance:token,...current}).strict(),
  z.object({action:z.literal("alternatives"),provenance:token,slot:z.number().int().min(0).max(7),...current}).strict(),
  z.object({action:z.literal("selection"),entries:selection,...current}).strict(),
  z.object({action:z.literal("basket"),entries:selection,proposed:z.unknown().optional(),...current}).strict(),
  z.object({action:z.literal("delete-vault"),id,...current}).strict(),
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
  return {...meal,user_id:userId,day:meal.kind==="dessert"?"Sweet Treat":"Dinner",notes:"Engineering candidate · not professionally reviewed or cooking-tested. "+plan.notice,instructions:meal.steps,
    ingredients:meal.ingredients.map(i=>({...i,amount:`${i.quantity} ${i.unit}`,price:i.estimatedCost})),dietaryRestrictions:plan.policy.originalEntry,library:{schemaVersion:1,provenance,recipeId,
    cacheKey:createHash("sha256").update(canonical([userId,provenance,recipeId,plan.policy.originalEntry,plan.policy.avoidedFoodIds])).digest("hex")}};
}
export type LibraryRecipe=ReturnType<typeof mealRecord>&{dbId?:string;scheduledDay?:"Monday"|"Tuesday"|"Wednesday"|"Thursday"|"Friday"|"Saturday"|"Sunday"};
function recordId(owner:string,provenance:string,recipeId:string){
  const hash=createHash("sha256").update(canonical([owner,provenance,recipeId])).digest("hex");
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
async function authorize(c:Context){
  if(!localLibraryEnabled())throw new LibraryError("NOT_FOUND",404,"Not found");
  return authorizeLocalLibrary(c.admin,c.userId,c.allowlist);
}
async function assertWeekReplaceable(currentDiet:string,avoid:string|undefined,c:Context){
  const rows=await c.user.from("weekly_menus").select("id,user_id,recipe_data").eq("user_id",c.userId).eq("status","active_week").limit(101);
  if(rows.error||rows.data?.length>100)throw new LibraryError("STORAGE",503,"Existing week could not be completely checked. No content was replaced.");
  for(const row of rows.data??[]){
    try{const e=row.recipe_data?.library,checked=restored(e?.provenance,currentDiet,avoid,c);mealRecord(checked.plan,e.recipeId,e.provenance,c.userId);}
    catch{throw new LibraryError("WEEK_REVIEW_REQUIRED",409,"This week contains unverified or incompatible saved content. It was preserved; review it before replacing the week.");}
  }
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
  return {job:{id:job.id,status:job.status,error:null},plan:checked.plan,recipes:checked.plan.meals.map(m=>mealRecord(checked.plan,m.id,result?.provenance as string,c.userId)),provenance:result?.provenance};
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
  if(command.action==="inventory"){
    const lists:Record<string,unknown[]>={vault:[],week:[]};let unavailable=0,weekBlocked=false;
    for(const [key,table] of [["vault","archived_meals"],["week","weekly_menus"]]){
      let query=c.user.from(table).select("id,user_id,recipe_data").eq("user_id",c.userId);
      if(key==="week")query=query.eq("status","active_week");
      const rows=await query.order("id",{ascending:true}).limit(101);
      if(rows.error||rows.data?.length>100)throw new LibraryError("STORAGE",503,"The local saved directory needs review; no partial list was presented as complete.");
      for(const row of rows.data??[]){
        try{const e=row.recipe_data?.library,checked=restored(e?.provenance,command.currentDiet,command.avoidIngredients,c);
          const recipe=mealRecord(checked.plan,e.recipeId,e.provenance,c.userId);
          const scheduled=z.enum(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]).safeParse(row.recipe_data?.scheduledDay);
          lists[key].push({...recipe,dbId:row.id,...(scheduled.success?{scheduledDay:scheduled.data}:{})});
        }catch(error){if(!(error instanceof LibraryError))throw error;unavailable++;if(key==="week")weekBlocked=true;}
      }
    }
    if(weekBlocked)lists.week=[];
    return {...lists,unavailable,weekBlocked,featurePlan:plan};
  }
  if(command.action==="delete-vault"){
    const deleted=await c.user.from("archived_meals").delete().eq("user_id",c.userId).eq("id",command.id);
    if(deleted.error)throw new LibraryError("STORAGE",503,"This local Vault recipe could not be deleted.");return {deleted:true};
  }
  if(command.action==="selection"||command.action==="basket"){
    const seen=new Set<string>();
    const meals=command.entries.map(entry=>{
      const checked=restored(entry.provenance,command.currentDiet,command.avoidIngredients,c);
      const recipe=mealRecord(checked.plan,entry.recipeId,entry.provenance,c.userId);
      if(seen.has(recipe.id))throw new LibraryError("DUPLICATE_RECIPE",422,"Choose each recipe once for this week.");seen.add(recipe.id);
      return {...recipe,...(entry.scheduledDay?{scheduledDay:entry.scheduledDay}:{})};
    });
    if(meals.filter(m=>m.kind==="dinner").length>7||meals.filter(m=>m.kind==="dessert").length>1)throw new LibraryError("WEEK_FULL",422,"This week supports seven dinners and one dessert; no membership limit was expanded.");
    if(command.action==="basket"){
      // Aggregate server-owned requirements. Do not double-subtract pantry stock
      // when recipes from different signed plans are combined. Collection checks
      // are presentation state; removing/changing a requirement is not approved.
      const quantities=new Map<string,{foodId:string;name:string;quantity:number;unit:string;estimatedCost:number}>();
      for(const meal of meals)for(const item of meal.ingredients){const old=quantities.get(item.foodId);quantities.set(item.foodId,{foodId:item.foodId,name:item.name,unit:item.unit,quantity:(old?.quantity??0)+item.quantity,estimatedCost:(old?.estimatedCost??0)+item.estimatedCost});}
      const groceries=[...quantities.values()].sort((a,b)=>a.foodId.localeCompare(b.foodId)).map(i=>({...i,quantity:Math.round(i.quantity*1000)/1000,estimatedCost:Math.round(i.estimatedCost*100)/100}));
      if(command.proposed!==undefined){
        const schema=z.array(z.object({foodId:z.string(),name:z.string(),quantity:z.number().positive(),unit:z.string(),estimatedCost:z.number().nonnegative()}).strict()).max(200);
        const supplied=schema.safeParse(command.proposed);
        if(!supplied.success||canonical([...supplied.data].sort((a,b)=>a.foodId.localeCompare(b.foodId)))!==canonical(groceries))throw new LibraryError("GROCERY_CHANGED",422,"The shopping requirements changed. Reopen the checked list; ingredients, units and quantities cannot be substituted or omitted.");
      }
      return {groceries,notice:"Full recipe requirements; check your actual pantry and product labels. Pantry amounts are not deducted when combining saved plans. Collection checkmarks are not ingredient verification."};
    }
    await assertWeekReplaceable(command.currentDiet,command.avoidIngredients,c);
    const saved=await c.user.rpc("save_mealcaddie_week",{meals:jsonValue(meals.map(m=>({user_id:c.userId,meal_title:m.name,type:m.kind,recipe_data:m}))),pantry:null});
    if(saved.error)throw new LibraryError("WEEK_SAVE",409,"The chosen week could not be saved. Existing content is unchanged.");return {saved:true};
  }
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
  if(command.action==="artifact")return {plan:checked.plan,recipes:checked.plan.meals.map(m=>mealRecord(checked.plan,m.id,command.provenance,c.userId)),provenance:command.provenance};
  if(command.action==="recipe")return {recipe:mealRecord(checked.plan,command.recipeId,command.provenance,c.userId)};
  if(command.action==="alternatives"){
    const {reviewedRecipes}=await import("./allergy-aware-recipes");
    return {alternatives:reviewedRecipes.filter(r=>!checked.plan.recipeIds.includes(r.id)&&replaceAllergyAwareRecipe(checked.plan.snapshot,command.currentDiet,command.slot,r.id).ok).map(r=>({id:r.id,name:r.title}))};
  }
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
  await assertWeekReplaceable(command.currentDiet,command.avoidIngredients,c);
  const saved=await c.user.rpc("save_mealcaddie_week",{meals:jsonValue(meals),pantry:null});
  if(saved.error)throw new LibraryError("WEEK_SAVE",409,"The week could not be saved. Existing content is unchanged.");
  return {saved:true};
}
