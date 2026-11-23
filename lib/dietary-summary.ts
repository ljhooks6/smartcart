import { readDiet } from "./dietary-safety.ts";
import { dietForGeneration } from "./dietary-request-value.ts";

export function dietarySummary(value = "") {
  const { legacy, settings, malformed } = readDiet(dietForGeneration(value));
  const unreadable = malformed || legacy.includes("MealCaddie dietary settings v1:") || Object.keys(settings).sort().join(",") !== "allergies,customAllergies,intolerances,medical,preferences";
  // A malformed saved value remains untouched in storage and safety inputs.
  // Only the text before the internal marker is suitable for a public summary.
  const original = legacy.split(/MealCaddie dietary settings v1:/)[0].trim();
  const rows = [
    original ? `Original entry: ${original}` : "",
    settings.preferences.length ? `Preferences: ${settings.preferences.join(", ")}` : "",
    settings.allergies.length ? `Allergies: ${settings.allergies.join(", ")}` : "",
    settings.customAllergies ? `Other allergies: ${settings.customAllergies}` : "",
    settings.intolerances ? `Intolerances: ${settings.intolerances}` : "",
    settings.medical ? `Medically related restrictions: ${settings.medical}` : "",
  ].filter(Boolean);
  return {
    rows: rows.length ? rows : [unreadable ? "Saved dietary settings need review." : "No dietary settings entered."],
    warning: unreadable ? "Some saved dietary settings could not be read. Your original data is preserved. Review Dietary settings before generating." : null,
  };
}
