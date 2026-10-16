import { allergens, dietChoices, readDiet, mergeDietaryEntries } from "./dietary-safety";
import { mentionedSources, normalizeFoodName, resolveFoodName, type Allergen } from "./allergy-aware-catalog";

export type Finding = { code: string; path: string; message: string };
export type RestrictionInput = { diet: string; originalDietaryRestrictions?: string; avoidIngredients?: string };
export type AllergyPolicy = {
  originalEntry: string; allergies: Allergen[]; excludedSources: Allergen[];
  intolerances: Array<{ kind: "lactose"; strategy: "exclude-milk-sources" }>;
  preferences: string[]; avoidedFoodIds: string[]; findings: Finding[];
};
const marker = "\nMealCaddie dietary settings v1: ";
const ordinary = /^(?:|none|no preference|no specific diet provided|no allergies|no known allergies|no dietary restrictions|vegetarian|vegan)$/i;
const expectedKeys = "allergies,customAllergies,intolerances,medical,preferences";
export function buildAllergyPolicy(input: RestrictionInput): AllergyPolicy {
  const findings: Finding[] = [];
  const add = (code: string, message: string) => findings.push({ code, path: "restrictions", message });
  for (const raw of [input.diet, input.originalDietaryRestrictions].filter(v => v !== undefined)) {
    if (typeof raw !== "string" || raw.length > 6000 || !raw.trim()) { add("DIET_UNREADABLE", "Review your saved dietary entry; it is missing or unreadable."); continue; }
    if (raw.includes(marker)) {
      try {
        const envelope = JSON.parse(raw.slice(raw.lastIndexOf(marker) + marker.length));
        if (!envelope || Object.keys(envelope).sort().join(",") !== expectedKeys) throw Error();
      } catch { add("DIET_UNREADABLE", "Unknown or unreadable dietary fields cannot be ignored."); }
    }
  }
  const originalEntry = mergeDietaryEntries(input.diet || "", input.originalDietaryRestrictions);
  const parsed = readDiet(originalEntry), s = parsed.settings;
  if (parsed.malformed) add("DIET_UNREADABLE", "Review the original dietary entry; it has been preserved.");
  const legacy = parsed.legacy.split(/[,;\n]/).map(v => v.trim()).filter(Boolean);
  if (legacy.some(v => !ordinary.test(v))) {
    const recognized = mentionedSources(parsed.legacy);
    add("LEGACY_CONFIRMATION", recognized.length
      ? `Confirm ${recognized.join(", ")} in the food-allergy controls; the original entry remains restricted.`
      : "Clarify the original entry using the separate allergy, intolerance and preference controls. Ambiguous entries remain restricted.");
  }
  if (s.customAllergies.trim()) add("CUSTOM_UNSUPPORTED", "Custom allergies do not yet have a complete ingredient-source catalog. Planning remains restricted for this entry.");
  if (s.medical.trim()) add("MEDICAL_UNSUPPORTED", "Medical diets require validation beyond ingredient exclusions and are not supported by this experiment.");
  const intolerances: AllergyPolicy["intolerances"] = [];
  if (s.intolerances.trim()) {
    if (/^(?:lactose|lactose intolerance)$/i.test(s.intolerances.trim())) intolerances.push({ kind: "lactose", strategy: "exclude-milk-sources" });
    else add("INTOLERANCE_UNSUPPORTED", "This intolerance cannot be checked by a source-exclusion rule. No tolerance threshold is assumed.");
  }
  const preferences = [...new Set([...s.preferences, ...legacy.filter(v => /^(?:vegetarian|vegan)$/i.test(v)).map(v => v[0].toUpperCase()+v.slice(1).toLowerCase())])];
  if (preferences.some(v => !["Vegetarian", "Vegan"].includes(v))) add("PREFERENCE_UNSUPPORTED", "This experiment supports Vegetarian and Vegan ingredient preferences only. Gluten-free, nutrient targets and religious certification require separate checks.");
  const avoidedFoodIds: string[] = [];
  const avoidance = input.avoidIngredients ?? "";
  if (typeof avoidance !== "string" || avoidance.length > 2000) add("AVOIDANCE_UNREADABLE", "Review the ingredient-avoidance list.");
  else for (const name of avoidance.split(/[,;\n]/).map(v => v.trim()).filter(Boolean)) {
    const plain = name.replace(/^(?:no|avoid|without)\s+/i, "");
    const profile = resolveFoodName(plain);
    if (!profile) add("AVOIDANCE_UNSUPPORTED", "An avoided ingredient is ambiguous or outside the catalog. Choose a specific plain ingredient; do not move a genuine allergy into preferences.");
    else avoidedFoodIds.push(profile.id);
  }
  const allergies = s.allergies.filter((v): v is Allergen => allergens.includes(v as Allergen));
  const excludedSources = [...new Set([...allergies, ...(intolerances.length ? ["Milk" as const] : [])])];
  return { originalEntry, allergies, excludedSources, intolerances, preferences, avoidedFoodIds: [...new Set(avoidedFoodIds)], findings };
}

export function ingredientFindings(name: string, policy: AllergyPolicy, path: string): Finding[] {
  const findings: Finding[] = [];
  const profile = resolveFoodName(name);
  const conflicts = mentionedSources(name).filter(a => policy.excludedSources.includes(a));
  if (conflicts.length) findings.push({ code: "SOURCE_CONFLICT", path, message: `${conflicts.join(", ")}: ${name}. This ingredient is excluded from this plan.` });
  if (!profile) findings.push({ code: "COMPOSITION_UNKNOWN", path, message: `Composition unresolved: ${name}. Use a cataloged plain ingredient or the exact server-owned homemade component; a label claim or model-supplied ingredient list is not verification.` });
  if (profile && policy.avoidedFoodIds.includes(profile.id)) findings.push({ code: "INGREDIENT_AVOIDED", path, message: `This plan excludes ${profile.name} by your ingredient preference.` });
  if (profile?.animal && policy.preferences.some(p => p === "Vegan" || (p === "Vegetarian" && !["milk", "egg"].includes(profile.id)))) findings.push({ code: "PREFERENCE_CONFLICT", path, message: `${profile.name} conflicts with the selected ${policy.preferences.join(" / ")} preference.` });
  return findings;
}

// Audit untrusted AI/legacy JSON. An audit never upgrades a free-form recipe to
// reviewed status. Unknown food fields, steps and alternatives cannot be waived
// with caller-supplied 'safe', 'verified', components or catalog IDs.
export function auditAllergyDraft(value: unknown, input: RestrictionInput) {
  const policy = buildAllergyPolicy(input), findings = [...policy.findings];
  let ingredientCount = 0, nodes = 0;
  const textFields = new Set(["name", "title", "meal_name", "description", "notes", "steps", "instructions", "quick_instructions"]);
  function visit(node: unknown, path: string, key = "", depth = 0) {
    if (++nodes > 5000 || depth > 12) { findings.push({ code: "INPUT_BOUNDS", path, message: "The candidate exceeds review bounds." }); return; }
    if (typeof node === "string") {
      if (node.length > 10000) { findings.push({ code: "INPUT_BOUNDS", path, message: "Candidate text exceeds review bounds." }); return; }
      const normalized = normalizeFoodName(node);
      if (/\b(?:allergen free|allergy safe|guaranteed safe|certified|medically safe|medically approved)\b/.test(normalized)) findings.push({ code: "UNSUPPORTED_ASSURANCE", path, message: "An unsupported safety assurance must not be presented as evidence." });
      if (["ingredients", "grocery_list", "restock_items", "pantry", "substitutions", "alternatives", "garnishes"].includes(key)) {
        ingredientCount++; findings.push(...ingredientFindings(node, policy, path));
      } else if (textFields.has(key)) {
        const conflict = mentionedSources(node).filter(a => policy.excludedSources.includes(a));
        if (conflict.length) findings.push({ code: "TEXT_SOURCE_CONFLICT", path, message: `Recipe text mentions excluded ${conflict.join(", ")}; it cannot override ingredient checks.` });
        if (["steps", "instructions", "quick_instructions"].includes(key)) findings.push({ code: "UNBOUND_INSTRUCTIONS", path, message: "Free-form instructions can add undeclared ingredients. Use the server-owned recipe steps; this draft cannot be released as checked." });
      } else if (!["amount", "unit", "category", "day", "imageUrl", "budget_summary"].includes(key)) findings.push({ code: "UNREVIEWED_FIELD", path, message: "Unreviewed candidate text or an alternative cannot silently bypass ingredient checks." });
      return;
    }
    if (Array.isArray(node)) {
      if (node.length > 200) { findings.push({ code: "INPUT_BOUNDS", path, message: "Candidate arrays exceed review bounds." }); return; }
      node.forEach((v, i) => visit(v, `${path}[${i}]`, key, depth+1)); return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (["ingredients", "grocery_list", "restock_items", "pantry", "substitutions", "alternatives", "garnishes"].includes(key)) {
      const name = record.name ?? record.item;
      if (typeof name !== "string" || !name.trim()) findings.push({ code: "INGREDIENT_MISSING", path, message: "A food item has no readable ingredient name." });
      else { ingredientCount++; findings.push(...ingredientFindings(name, policy, path)); }
    }
    if (Object.keys(record).length > 40) { findings.push({ code: "INPUT_BOUNDS", path, message: "Candidate fields exceed review bounds." }); return; }
    for (const [field, content] of Object.entries(record)) visit(content, `${path}.${field}`, field, depth+1);
  }
  visit(value, "candidate");
  if (!ingredientCount) findings.push({ code: "INGREDIENT_MISSING", path: "candidate", message: "A complete ingredient list is required." });
  const unique = [...new Map(findings.map(f => [JSON.stringify(f), f])).values()];
  return { status: unique.some(f => /CONFLICT/.test(f.code)) ? "conflict" : unique.length ? "uncertain" : "declared-ingredients-checked", ingredientCount, findings: unique,
    releaseEligible: false as const, message: "Draft ingredient review only. Free-form AI or historical recipes require a server-owned recipe specification before controlled release. Cross-contact and product labels are not verified." };
}
