import {z} from "zod";
import {preparationIssue} from "./pantry-preparation.ts";
import {fitPantryPlan,type PantryPlanInput} from "./pantry-plan-quantities.ts";

type Ingredient={name:string;amount:string};
export const pantryActionSchema=z.object({
  prep_time_minutes:z.number().int().min(1).max(240),
  actions:z.array(z.object({action:z.enum(["chop","heat","saute","mix","simmer","rest","serve"]),ingredientIds:z.array(z.number().int().min(0)).min(1).max(40),minutes:z.number().int().min(0).max(120)}).strict()).min(3).max(20),
}).strict();
export type PantryActions=z.infer<typeof pantryActionSchema>;
export function pantryRecipeProblems(value:PantryActions,ingredients:Ingredient[],maximum:number,equipment:string[]) {
  const errors:string[]=[];
  if(value.prep_time_minutes>maximum||value.actions.reduce((n,a)=>n+a.minutes,0)>value.prep_time_minutes)errors.push("Elapsed preparation exceeds the selected limit.");
  if(value.actions.at(-1)?.action!=="serve")errors.push("Finish by serving the meal.");
  const used=new Set<number>();
  for(const step of value.actions){
    if(new Set(step.ingredientIds).size!==step.ingredientIds.length||step.ingredientIds.some(i=>!ingredients[i])){errors.push("Unknown or repeated ingredient reference.");continue;}
    const names=step.ingredientIds.map(i=>ingredients[i].name);
    if(["heat","saute","simmer"].includes(step.action)&&!equipment.includes("Stovetop"))errors.push("Stovetop is required.");
    if(["chop","mix","serve"].includes(step.action)&&step.minutes>30)errors.push("Preparation action timing needs review.");
    if(step.action==="chop"&&names.some(n=>!/\b(carrot|onion|tomato|garlic|celery|potato|zucchini)s?\b|\b(bell|sweet|jalapeño|jalapeno) peppers?\b/i.test(n)))errors.push("Unsupported chopping instruction.");
    if(["saute","mix","simmer"].includes(step.action))step.ingredientIds.forEach(i=>used.add(i));
  }
  if(ingredients.some((_,i)=>!used.has(i)))errors.push("Every listed ingredient must be used in the meal, not an extra side.");
  if(ingredients.some(i=>!!preparationIssue(i.name)))errors.push("Preparation form is unresolved or unsupported.");
  for(const [index,i] of ingredients.entries())if(/^dry .*rice/i.test(i.name)){
    const minimum=/brown/i.test(i.name)?40:15;
    if(!value.actions.some(a=>a.action==="simmer"&&a.ingredientIds.includes(index)&&a.minutes>=minimum&&a.ingredientIds.some(id=>/^water$/i.test(ingredients[id]?.name))))errors.push("Dry rice requires a timed simmer with explicitly listed water; no cooked-yield substitution.");
  }
  return [...new Set(errors)];
}
export function renderPantryActions(value:PantryActions,ingredients:Ingredient[],servings:number){
  const introduced=new Set<number>();
  return value.actions.map(step=>{
    const names=step.ingredientIds.map(i=>ingredients[i].name).join(", ");
    const fresh=step.ingredientIds.filter(i=>!introduced.has(i));
    if(["heat","saute","mix","simmer"].includes(step.action))step.ingredientIds.forEach(i=>introduced.add(i));
    const allocation=fresh.length?`Use only the listed amounts of ${fresh.map(i=>ingredients[i].name).join(", ")}. `:"Continue with the same measured ingredients; do not add more. ";
    const time=step.minutes?` for ${step.minutes} minute(s)`:"";
    if(step.action==="serve")return `Serve the prepared meal in ${servings} portions. No additional sides or garnishes are included.`;
    if(step.action==="rest")return `Let the prepared ${names} rest${time}; add nothing.`;
    if(step.action==="chop")return `Chop the listed ${names}${time}, keeping the entire measured amount.`;
    const poultry=step.ingredientIds.some(i=>/\b(chicken|turkey)\b/i.test(ingredients[i].name)&&!/(cooked|canned|rotisserie|deli|stock|broth)/i.test(ingredients[i].name));
    return `${allocation}${step.action==="mix"?"Combine":step.action==="saute"?"Sauté":step.action==="simmer"?"Simmer":"Heat"} ${names}${time}${step.action==="mix"?".":" on the stovetop."} Do not substitute forms or add unlisted liquid.${poultry?" Check the poultry's thickest part with a food thermometer: 165°F/74°C; color alone is not a doneness check.":""}`;
  });
}
export function pantryRecipeStockProblems(ingredients:Ingredient[],inventory:PantryPlanInput){
  return fitPantryPlan([{ingredients}],[],inventory).omitted;
}
export function quantifiedPantryProse(name:string,ingredients:Ingredient[],servings:number){
  const style=/stir.fry|skillet|stew|soup|pilaf|ragout|salad|pasta/i.exec(name)?.[0].toLowerCase()??"dinner";
  const title=ingredients.slice(0,2).map(i=>i.name).join(" and ")+" "+style;
  return {name:title,description:`${servings} portions using ${ingredients.map(i=>i.name).join(", ")}. All required amounts are listed; no additional side is included.`,notes:"Use only the listed quantities and confirmed preparation forms. Recheck pantry amounts before cooking."};
}
