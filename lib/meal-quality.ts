import { usableDescription } from "./recipe-description";
type Ingredient = { name: string; amount?: string; price: number };
type Dish = { name?: string; title?: string; notes?: string; description?: string; ingredients: Ingredient[]; prepTime?: number; prep_time_minutes?: number; servings?: number };
type Plan = { meals: Dish[]; breakfasts?: Dish[]; lunches?: Dish[]; desserts?: Dish[] };
export function culinaryReview(plan: Plan, pantryOnly = false) {
  const titles = plan.meals.map(m => (m.name || "").toLowerCase());
  const families = ["bowl", "soup|chowder", "pasta|spaghetti|gnocchi", "bean|lentil|chickpea", "taco|quesadilla", "rice"];
  const repetition = families.filter(p => titles.filter(t => new RegExp(`\\b(${p})s?\\b`).test(t)).length > (p === "rice" ? 3 : 2));
  const missingDescriptions = [...plan.meals,...(plan.breakfasts||[]),...(plan.lunches||[]),...(plan.desserts||[])].filter(m => !usableDescription(m.description)).length;
  const issues = [...(!pantryOnly ? repetition.map(p => `Too many ${p} dishes; vary the actual dish format, not just titles.`) : []), ...(missingDescriptions ? [`${missingDescriptions} dishes need a finished-dish description, separate from preparation.`] : [])];
  return { issues, missingDescriptions, repetition };
}
export const pantryIngredientKey = (name: string) => name.toLowerCase().replace(/\[[^\]]*\]/g, "").replace(/[^a-z0-9 ]/g," ").replace(/\b(?:fresh|raw|chopped|diced)\b/g,"").trim().replace(/\s+/g," ").replace(/s$/, "");
export function foodTermMatches(text: string, term: string) {
  const words=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  return (` ${words(text)} `).includes(` ${words(term)} `);
}
export function equipmentRequirementText(text: string) {
  // Remove only explicit negative equipment statements. A positive requirement
  // elsewhere in the same recipe is still checked. Never use this for allergens.
  return text.toLowerCase()
    .replace(/\b(?:requires?|needs?) no (?:blender|oven|grill)\b/g, "")
    .replace(/\b(?:no|without|do not use|does not require) (?:a |an )?(?:blender|oven|grill)\b/g, "")
    .replace(/\bnothing is (?:blended|pur[eé]ed)(?: or (?:blended|pur[eé]ed))?\b/g, "");
}
export function planConstraintIssues(plan: Plan, input: { budget: number; householdSize: number; mealSourceMode?: string; combinedPantryItems?: string; fullyStocked?: string[]; runningLow?: string[]; restock?: string[]; prepTime?: string }) {
  const dishes=[...plan.meals,...(plan.breakfasts||[]),...(plan.lunches||[]),...(plan.desserts||[])];
  const issues: string[]=[];
  const limits=(input.prepTime?.match(/\d+/g)||[]).map(Number);const maximum=limits.length?Math.max(...limits):null;
  for(const dish of dishes) {
    if(dish.servings && dish.servings!==input.householdSize)issues.push("Recipe servings do not match the household size.");
    if(maximum && (!dish.prep_time_minutes || dish.prep_time_minutes>maximum))issues.push("Cooking time is missing or exceeds the selected time limit.");
    const title=dish.name||dish.title||"",names=dish.ingredients.map(i=>i.name.toLowerCase()).join(" ");
    for(const [named,required] of [[/streusel/i,/flour|oat/],[/chocolate/i,/chocolate|cocoa/],[/lemon/i,/lemon/],[/blueberry/i,/blueberr/],[/pumpkin/i,/pumpkin/],[/pesto/i,/pesto|basil/],[/gnocchi/i,/gnocchi/]] as const)if(named.test(title)&&!required.test(names))issues.push("Named component lacks supporting ingredients: "+title);
  }
  if(input.mealSourceMode === "pantry-only") {
    const available=new Set([...(input.combinedPantryItems||"").split(/[,;\n]/),...(input.fullyStocked||[]),...(input.runningLow||[])].map(pantryIngredientKey));
    for(const dish of dishes) for(const i of dish.ingredients) if(!available.has(pantryIngredientKey(i.name)) && pantryIngredientKey(i.name)!=="water") issues.push(`Pantry-only ingredient unavailable: ${i.name}`);
  }
  // Prices retain the existing estimated per-entry semantics; this is not a local cart quote.
  const total=dishes.reduce((sum,d)=>sum+d.ingredients.reduce((s,i)=>s+i.price,0),0);
  if(input.mealSourceMode !== "pantry-only" && total > input.budget+0.01) issues.push("Estimated ingredient total exceeds the selected budget.");
  return [...new Set(issues)];
}
