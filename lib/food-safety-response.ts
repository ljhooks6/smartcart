import { allergySafetyResponse } from "./allergy-safety";
import { readDiet } from "./dietary-safety";

// Preserve the production guard unchanged for legacy text. A strictly parsed
// Preview envelope with no allergy/intolerance/medical entry can carry ordinary
// preferences; never discard an unknown field or an actual restriction.
export function foodSafetyResponse(input: unknown, required = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return allergySafetyResponse(input, required);
  const body = input as Record<string,unknown>, field = typeof body.diet === "string" ? "diet" : "dietaryRestrictions";
  const raw = body[field]; const marker = "\nMealCaddie dietary settings v1: ";
  if (typeof raw !== "string" || !raw.includes(marker)) return allergySafetyResponse(input, required);
  try {
    const payload = JSON.parse(raw.slice(raw.lastIndexOf(marker)+marker.length));
    if (Object.keys(payload).sort().join(",") !== "allergies,customAllergies,intolerances,medical,preferences") return allergySafetyResponse(input,required);
    const {legacy,settings,malformed} = readDiet(raw);
    if (malformed || settings.allergies.length || settings.customAllergies.trim() || settings.intolerances.trim() || settings.medical.trim()) return allergySafetyResponse(input,required);
    const noRestriction = ["","none","no preference","no specific diet provided","no allergies","no known allergies","no dietary restrictions"].includes(legacy.trim().toLowerCase());
    return allergySafetyResponse({...body,[field]:[noRestriction ? "" : legacy.trim(),...settings.preferences].filter(Boolean).join(", ")},required);
  } catch { return allergySafetyResponse(input,required); }
}
