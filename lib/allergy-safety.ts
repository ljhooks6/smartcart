import { NextResponse } from "next/server";
export const allergySafetyMessage = "AI generation for allergy-dependent, free-from or unverified dietary restrictions is temporarily unavailable. MealCaddie cannot verify ingredient composition, substitutions or cross-contact. Your dietary text and saved content remain unchanged. Do not remove an actual restriction to get a result; verify food independently or seek qualified advice.";
const negativeFood = /\b(?:milk|dairy|eggs?|fish|seafood|shellfish|nuts?|peanuts?|tree nuts?|wheat|gluten|soy|soya|sesame)\s*[- ]?free\b|\b(?:no|without|avoid|exclude)\s+(?:milk|dairy|eggs?|fish|seafood|shellfish|nuts?|peanuts?|tree nuts?|wheat|gluten|soy|soya|sesame)\b/i;
export function allergyDependent(text: string) {
 const value=text.trim().toLowerCase();
 // Only an entire explicit no-restriction value is exempt. Do not erase a
 // restriction from mixed text or guess that severity/absence is established.
 if(["","none","no preference","no specific diet provided","no allergies","no known allergies","no dietary restrictions"].includes(value))return false;
 if(/allerg|anaphyla|intoleran|c[eo]eliac/i.test(value) || negativeFood.test(value))return true;
 const ordinary = new Set(["vegetarian","vegan","pescatarian","halal","kosher","low sodium","low-sodium","low carb","low-carb","low fat","low-fat","high protein","high-protein","keto","ketogenic","mediterranean","meat-free","meat free","no red meat","no beef","no pork","no chicken","no turkey"]);
 return value.split(/[,;\n]/).some(part=>!ordinary.has(part.trim()));
}
export function allergySafetyErrors(input: unknown, requireDiet = false) {
 if(!input||typeof input!=="object"||Array.isArray(input))return requireDiet?["Review dietary settings before generating food."]:[]; 
 const body=input as Record<string,unknown>;
 const diet=body.diet ?? body.dietaryRestrictions;
 if(requireDiet&&typeof diet!=="string")return ["Provide your dietary settings explicitly before generating food. Saved meals do not establish current suitability."];
 const avoid=typeof body.avoidIngredients==="string"?body.avoidIngredients:"";
 return (typeof diet==="string"&&allergyDependent(diet)) || /allerg|anaphyla|intoleran/i.test(avoid) || negativeFood.test(avoid) ? [allergySafetyMessage] : [];
}
export function allergySafetyResponse(input: unknown, requireDiet = false) {
 const errors=allergySafetyErrors(input,requireDiet);
 return errors.length?NextResponse.json({error:errors.join(" "),code:"ALLERGY_GENERATION_RESTRICTED",retryable:false},{status:422}):null;
}
