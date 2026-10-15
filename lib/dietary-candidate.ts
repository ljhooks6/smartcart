import { readDiet, assessDiet, allergens, type DietarySettings } from "./dietary-safety";
// Review-only boundary: cannot lift the production restriction, even if an env flag is set.
export function dietaryCandidateEnabled() { return process.env.MEALCADDIE_DIETARY_CANDIDATE === "true" && process.env.VERCEL_ENV !== "production"; }
const ordinary = /^(?:|none|no preference|no specific diet provided|no allergies|no known allergies|no dietary restrictions|vegetarian|vegan|halal|kosher|low sodium|pescatarian|mediterranean)$/i;
export function candidatePolicy(input: Record<string,unknown>) {
  const raw=typeof input.diet === "string" ? input.diet : typeof input.dietaryRestrictions === "string" ? input.dietaryRestrictions : "";
  const parsed=readDiet(raw), settings: DietarySettings={...parsed.settings,allergies:[...parsed.settings.allergies]};
  const errors: string[]=[];
  if(raw.includes("\nMealCaddie dietary settings v1: ")) { try {const envelope=JSON.parse(raw.slice(raw.lastIndexOf("\nMealCaddie dietary settings v1: ")+"\nMealCaddie dietary settings v1: ".length));if(Object.keys(envelope).sort().join(",")!=="allergies,customAllergies,intolerances,medical,preferences")errors.push("Unknown dietary fields are not supported.");} catch { errors.push("Dietary settings could not be parsed."); } }
  if(parsed.malformed || !raw.trim()) errors.push("Review your original dietary settings; they are incomplete or unreadable.");
  if(parsed.legacy.split(/[,;\n]/).some(s=>!ordinary.test(s.trim()))) errors.push("Use the explicit allergy controls for supported restrictions. Unclassified original text remains restricted; do not remove genuine allergies to proceed.");
  if(settings.medical.trim()) errors.push("Medically directed restrictions are not supported by this candidate.");
  if(settings.customAllergies.trim()) errors.push("Custom allergy composition and aliases are unsupported; generation remains restricted.");
  if(settings.intolerances.trim()) {
    if(/^(?:lactose|lactose intolerance|milk|dairy)$/i.test(settings.intolerances.trim())) settings.allergies.push("Milk");
    else errors.push("This intolerance cannot yet be validated reliably.");
  }
  if(settings.preferences.includes("Gluten-free")) errors.push("Gluten exclusion requires broader grain and manufacturing validation; it remains restricted.");
  const avoid=typeof input.avoidIngredients === "string" ? input.avoidIngredients.trim() : "";
  if(/allerg|intoler|anaphyla|free\b|\bno\b|\bavoid\b/i.test(avoid)) errors.push("Use explicit allergy selections; ambiguous exclusion phrases remain restricted.");
  return {raw,settings:{...settings,allergies:[...new Set(settings.allergies)]},errors,avoid:avoid.split(/[,;\n]/).map(s=>s.trim().toLowerCase()).filter(Boolean)};
}
const wholeFoods=new Set("water,rice,brown rice,white rice,carrot,carrots,tomato,tomatoes,potato,potatoes,onion,onions,garlic,apple,apples,banana,bananas,spinach,broccoli,chicken breast,chicken thighs,beef,turkey,pork,salmon,cod,shrimp,tofu,eggs,egg,milk,olive oil,salt,black pepper,lemon,lime,cucumber,zucchini,green beans,oats,quinoa,lentils,chickpeas,white beans,black beans,peanuts,almonds,sesame seeds,wheat flour,soybeans".split(","));
function foodIngredients(value: unknown): string[] {
  if(Array.isArray(value)) return value.flatMap(foodIngredients);
  if(!value || typeof value!=="object") return [];
  return Object.entries(value).flatMap(([k,v])=>k==="ingredients" && Array.isArray(v) ? v.map(i=>typeof i==="string"?i:typeof i?.name==="string"?i.name:"") : k==="restock_items" && Array.isArray(v) ? v.map(i=>typeof i?.item==="string"?i.item:"") : foodIngredients(v));
}
export function candidateOutputIssues(value: unknown, input: Record<string,unknown>) {
  const p=candidatePolicy(input);if(p.errors.length)return p.errors;
  const raw=p.raw.slice(0,p.raw.lastIndexOf("\nMealCaddie dietary settings v1: "));
  const diet=raw+"\nMealCaddie dietary settings v1: "+JSON.stringify(p.settings);
  const review=assessDiet(value,diet), names=foodIngredients(value);
  const issues=[...review.conflicts];
  if(/\b(?:allergy.safe|allergen.free|certified|medically (?:safe|approved))\b/i.test(JSON.stringify(value))) issues.push("Unsupported medical or allergen-safety claim.");
  if(p.settings.allergies.length && !names.length) issues.push("Ingredient composition is missing.");
  for(const n of names) {
    const key=n.toLowerCase().replace(/\[restock\]/g,"").replace(/^\s*[\d/.,½¼¾]+\s*(?:cups?|tbsp|tsp|lbs?|oz|grams?|g|kg)?\s*/, "").trim();
    if(p.avoid.some(a=>new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(key))) issues.push("Explicitly avoided ingredient: "+n);
    if(p.settings.allergies.length && !wholeFoods.has(key)) issues.push("Composition not verified for: "+n);
  }
  return [...new Set(issues)];
}
export const supportedCandidateAllergens=allergens;
