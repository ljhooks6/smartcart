export const allergens = ["Milk","Eggs","Fish","Crustacean shellfish","Tree nuts","Peanuts","Wheat","Soy","Sesame"] as const;
export const dietChoices = ["Vegetarian","Vegan","Gluten-free","Halal","Kosher","Low sodium"];
export type DietarySettings = { allergies: string[]; preferences: string[]; customAllergies: string; intolerances: string; medical: string };
const marker = "\nMealCaddie dietary settings v1: ";
export function readDiet(value = ""): { legacy: string; settings: DietarySettings; malformed: boolean } {
 const empty = {allergies:[],preferences:[],customAllergies:"",intolerances:"",medical:""};
 const at=value.lastIndexOf(marker); if(at<0)return{legacy:value,settings:empty,malformed:false};
 try { const s=JSON.parse(value.slice(at+marker.length)); if(!s || !Array.isArray(s.allergies) || !s.allergies.every((a: unknown)=>typeof a==="string"&&allergens.includes(a as typeof allergens[number])) || !Array.isArray(s.preferences) || !s.preferences.every((a: unknown)=>typeof a==="string"&&dietChoices.includes(a)) || !["customAllergies","intolerances","medical"].every(k=>typeof s[k]==="string"&&s[k].length<=1000))throw Error();
 return{legacy:value.slice(0,at),settings:s,malformed:false}; } catch {return{legacy:value,settings:empty,malformed:true};}
}
export function writeDiet(legacy: string, settings: DietarySettings) {return legacy+marker+JSON.stringify(settings);}
export function mergeDietaryEntries(current: string, original?: string) {
 if(!original || original===current)return current;
 const a=readDiet(current),b=readDiet(original);
 if(a.malformed||b.malformed)return original+"\n"+current;
 return writeDiet([a.legacy,b.legacy].filter(Boolean).join(", "),{
  allergies:[...new Set([...a.settings.allergies,...b.settings.allergies])],
  preferences:[...new Set([...a.settings.preferences,...b.settings.preferences])],
  customAllergies:[a.settings.customAllergies,b.settings.customAllergies].filter(Boolean).join(", "),
  intolerances:[a.settings.intolerances,b.settings.intolerances].filter(Boolean).join(", "),
  medical:[a.settings.medical,b.settings.medical].filter(Boolean).join(", "),
 });
}
const aliases: Record<string,RegExp> = {
 Milk:/\b(milk|cheese|cream|butter|yogurt|yoghurt|whey|casein(?:ate)?|ghee|curds?|buttermilk|lactalbumin)\b/i,
 Eggs:/\b(eggs?|albumen|ovalbumin|meringue|mayonnaise|mayo|aioli)\b/i,
 Fish:/\b(fish|salmon|tuna|cod|anchov(?:y|ies)|sardines?|haddock|tilapia|bonito|surimi|fish sauce)\b/i,
 "Crustacean shellfish":/\b(shrimps?|prawns?|crabs?|lobsters?|crayfish|crawfish|krill)\b/i,
 "Tree nuts":/\b(almonds?|walnuts?|cashews?|pecans?|pistachios?|hazelnuts?|filberts?|macadamias?|brazil nuts?|pine nuts?|marzipan|praline)\b/i,
 Peanuts:/\b(peanuts?|groundnuts?|arachis)\b/i,
 Wheat:/\b(wheat|semolina|durum|spelt|farro|bulgur|couscous|seitan|breadcrumbs?|bread|pasta|soy sauce)\b/i,
 Soy:/\b(soy|soya|soybeans?|tofu|tempeh|edamame|miso|tamari|shoyu)\b/i,
 Sesame:/\b(sesame|tahini|benne|gingelly|til)\b/i,
};
export const safetyNotice = "Ingredient checks are limited. Verify every package label, manufacturer information, substitutions, preparation conditions and cross-contact independently. MealCaddie cannot guarantee food safety and does not provide medical or nutritional treatment advice.";
export function ingredientTexts(value: unknown): string[] {
 if(typeof value==="string")return [value];
 if(Array.isArray(value))return value.flatMap(ingredientTexts);
 if(value&&typeof value==="object")return Object.entries(value).filter(([k])=>["ingredients","name","item","steps","notes","description","title","meal_name","quick_instructions","instructions","meals","breakfasts","lunches","desserts","grocery_list","restock_items","produce","meat_and_dairy","pantry"].includes(k)).flatMap(([,v])=>ingredientTexts(v));
 return [];
}
export function assessDiet(value: unknown, diet = "") {
 const {legacy,settings,malformed}=readDiet(diet); const names=ingredientTexts(value);
 const conflicts: string[]=[]; const uncertainty: string[]=[];
 if(malformed)uncertainty.push("Saved dietary settings could not be read; review your original entry.");
 if(legacy.trim())uncertainty.push("Legacy dietary text has been preserved. Confirm allergies in the separate allergy controls; this text is not automatically classified.");
 if(settings.intolerances||settings.medical)uncertainty.push("Intolerances and medically related restrictions require independent review.");
 const custom=settings.customAllergies.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);
 if(custom.length)uncertainty.push("Custom allergy aliases and ingredient composition cannot be determined completely.");
 if((settings.allergies.length||custom.length)&&!names.length)uncertainty.push("The ingredient list is missing or incomplete.");
 for(const raw of names) {
  const n=raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[-_]/g," ");
  for(const allergy of settings.allergies) {
   let checked=n;
   // A declared qualifier is still uncertainty, never certification. Remove only
   // the label claim itself; almond in dairy-free almond milk still conflicts.
   if(allergy==="Milk"&&/\b(?:oat|almond|soy|rice|coconut|cashew|pea) (?:milk|cream|butter|yogurt)\b/.test(n)) {uncertainty.push("Plant-based dairy alternatives require label and composition verification.");checked=checked.replace(/\b(?:oat|almond|soy|rice|coconut|cashew|pea) (?:milk|cream|butter|yogurt)\b/g,"");}
   if(/\bfree\b|\bvegan\b|\bplant based\b|\bnon dairy\b/.test(n)) uncertainty.push("Dietary label claims do not establish allergen suitability.");
   checked=checked.replace(/\b(?:milk|egg|peanut|soy|sesame|wheat|nut|dairy|gluten) free\b/g,"");
   if(aliases[allergy]?.test(checked))conflicts.push(allergy+": "+raw);
  }
  const plain=n.replace(/^\s*[\d/.,]+\s*(?:cups?|tbsp|tsp|lbs?|oz|grams?|g|kg)?\s*/, "").replace(/^(?:fresh|raw|cooked|chopped|diced)\s+/, "");
  if((settings.allergies.length||custom.length)&&! /^(?:water|rice|brown rice|white rice|carrots?|tomatoes?|eggplant|potatoes?|onions?|garlic|apples?|bananas?|spinach|broccoli|chicken breast|olive oil|salt|black pepper)$/.test(plain)) uncertainty.push("Unrecognized or processed ingredient descriptions need independent review.");
  for(const item of custom)if((" "+n.replace(/[^a-z0-9]/g," ")+" ").includes(" "+item.toLowerCase().replace(/[^a-z0-9]/g," ")+" "))conflicts.push("Custom allergy: "+raw);
  if((settings.allergies.length||custom.length)&&/\b(sauce|stock|broth|dressing|seasoning|spice blend|pesto|flour|chocolate|protein powder|natural flavors?|optional|substitut|or |as needed|mixed|spread|bakery)\b/.test(n))uncertainty.push("Mixed, composite or alternative ingredients need label and composition review.");
 }
 return {status:conflicts.length?"conflict":uncertainty.length?"uncertain":settings.allergies.length?"no-known-conflict":"not-assessed",conflicts:[...new Set(conflicts)],uncertainty:[...new Set(uncertainty)],notice:safetyNotice};
}
export function allergyConflicts(value: unknown, diet?: string) {return assessDiet(value,diet).conflicts;}
