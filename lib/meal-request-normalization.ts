const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const DIET_DELIMITERS = /,|\/|;|\band\b|\&/i;

const BLOCKED_CATEGORY_MAP: Record<string, string[]> = {
  dairy: ["milk", "cream", "cheese", "butter", "yogurt", "sour cream"],
  eggs: ["egg", "eggs", "mayonnaise"],
  gluten: ["flour", "bread", "pasta", "breadcrumbs", "soy sauce", "tortilla"],
  red_meat: ["beef", "steak", "ground beef", "lamb", "venison", "bison"],
  shellfish: ["shrimp", "crab", "lobster", "scallops", "clams", "mussels", "oysters"],
  tree_nuts: ["almonds", "walnuts", "pecans", "cashews", "pistachios"],
};

function uniqueList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => safeTrim(value).toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function parseMustHaveIngredients(input?: string) {
  const normalized = safeTrim(input);
  if (!normalized) {
    return [];
  }

  return uniqueList(
    normalized
      .split(DIET_DELIMITERS)
      .map((item) => item.replace(/^must have\s+/i, ""))
      .map((item) => item.replace(/^include\s+/i, ""))
      .map((item) => item.replace(/^with\s+/i, "")),
  );
}

export function parseAvoidanceItems(input?: string) {
  const normalized = safeTrim(input);
  if (!normalized) {
    return [];
  }

  return uniqueList(
    normalized
      .split(DIET_DELIMITERS)
      .map((item) => item.replace(/^no\s+/i, ""))
      .map((item) => item.replace(/^avoid\s+/i, ""))
      .map((item) => item.replace(/^don't want\s+/i, ""))
      .map((item) => item.replace(/^do not want\s+/i, "")),
  );
}

export function buildAvoidanceGuidance(input?: string) {
  const avoidedItems = parseAvoidanceItems(input);

  if (avoidedItems.length === 0) {
    return {
      avoidedItems,
      promptBlock: "No specific disliked ingredients, sauces, or meal styles were provided.",
    };
  }

  return {
    avoidedItems,
    promptBlock: `Strictly avoid these ingredients, sauces, flavors, or meal styles unless the user explicitly asks for them later: ${avoidedItems.join(", ")}.`,
  };
}

export function buildMustHaveGuidance(input?: string) {
  const mustHaveIngredients = parseMustHaveIngredients(input);

  if (mustHaveIngredients.length === 0) {
    return {
      mustHaveIngredients,
      promptBlock: "No must-have ingredients were provided.",
    };
  }

  let distributionRule = `Feature ${mustHaveIngredients[0]} prominently in at least 3 of the 7 dinner meals.`;

  if (mustHaveIngredients.length === 2) {
    distributionRule = `Use both must-have ingredients across at least 4 of the 7 meals total. Do not force both ingredients into the same meal unless it makes culinary sense.`;
  } else if (mustHaveIngredients.length >= 3) {
    distributionRule = `Distribute these must-have ingredients naturally across the week. Use at least 3 of them across the menu, but do not force every meal to contain a must-have ingredient.`;
  }

  return {
    mustHaveIngredients,
    promptBlock: `Must-have ingredients: ${mustHaveIngredients.join(", ")}. ${distributionRule}`,
  };
}

export function buildAdventureLevelGuidance(adventureLevel?: string) {
  const normalized = safeTrim(adventureLevel).toLowerCase();

  if (normalized.includes("stick") || normalized.includes("simple") || normalized.includes("basic")) {
    return {
      generationBlock:
        "Adventure guidance: keep the week grounded in familiar, realistic dinners. At least 4 meals should be classic weeknight staples or comfort-food adjacent. Prioritize classics like burgers and fries, turkey or chicken burgers, chicken wraps, spaghetti and meatballs, tacos, baked pasta, pork chops with sides, BBQ chicken plates, meatloaf, quesadillas, and sheet-pan dinners. Use mild-to-moderate seasoning and avoid making the week feel exotic, overly spiced, or trend-chasing.",
      replacementBlock:
        "Replacement guidance: choose a clearly different but still familiar weeknight staple. Burgers, wraps, simple pasta dishes, tacos, baked chicken plates, pork chop plates, quesadillas, and homestyle skillet meals are all valid replacements. Do not drift into globally themed meals unless the rejected meal itself was already very simple and repetitive.",
    };
  }

  if (normalized.includes("mix")) {
    return {
      generationBlock:
        "Adventure guidance: build a balanced week. Include at least 3 familiar comfort meals, at least 3 approachable global or fusion meals, and let the final 1 or 2 meals add variety without getting too niche. The week should visibly mix classic American staples with more varied but still approachable cuisine lanes.",
      replacementBlock:
        "Replacement guidance: choose something distinct from the rejected meal, but keep it approachable. Aim for a different cuisine lane, protein, and format without becoming too obscure. The replacement should feel like something a normal weeknight cook would still gladly make.",
    };
  }

  if (normalized.includes("try")) {
    return {
      generationBlock:
        "Adventure guidance: push for variety. Keep only 1 or 2 familiar anchor meals, then use the rest of the week for clearly different cuisines, proteins, and formats. Use globally inspired meals on purpose and do not let the menu drift back to repetitive defaults or the same sauce profile.",
      replacementBlock:
        "Replacement guidance: choose a replacement that clearly changes cuisine, protein, and format from the rejected meal and from the majority of the current menu. Prefer a new cuisine lane or preparation style over a small rename.",
    };
  }

  return {
    generationBlock:
      "Adventure guidance: vary the week intentionally and avoid repetitive defaults.",
    replacementBlock:
      "Replacement guidance: choose a meal that clearly changes the protein, format, or flavor lane from the rejected meal.",
  };
}

export function parseMealNameList(input?: string) {
  const normalized = safeTrim(input);
  if (!normalized) {
    return [];
  }

  return uniqueList(
    normalized
      .split(/,|;|\n/)
      .map((item) => item.replace(/^[-*]\s*/, "")),
  );
}

export function normalizeDietaryPreferences(dietInput?: string) {
  const normalizedInput = safeTrim(dietInput);
  const lower = normalizedInput.toLowerCase();
  const blockedIngredients = new Set<string>();
  const blockedCategories = new Set<string>();
  const hardRules: string[] = [];
  const softRules: string[] = [];

  const addCategory = (category: keyof typeof BLOCKED_CATEGORY_MAP) => {
    blockedCategories.add(category);
    BLOCKED_CATEGORY_MAP[category].forEach((item) => blockedIngredients.add(item));
  };

  if (lower.includes("vegetarian")) {
    hardRules.push("Vegetarian: no meat or seafood.");
    ["beef", "steak", "ground beef", "pork", "bacon", "ham", "chicken", "turkey", "sausage", "salmon", "shrimp", "tuna"].forEach((item) =>
      blockedIngredients.add(item),
    );
    blockedCategories.add("meat");
    blockedCategories.add("seafood");
  }

  if (lower.includes("vegan")) {
    hardRules.push("Vegan: no meat, seafood, dairy, eggs, or honey.");
    ["beef", "steak", "ground beef", "pork", "bacon", "ham", "chicken", "turkey", "sausage", "salmon", "shrimp", "tuna", "honey"].forEach((item) =>
      blockedIngredients.add(item),
    );
    addCategory("dairy");
    addCategory("eggs");
    blockedCategories.add("meat");
    blockedCategories.add("seafood");
  }

  if (lower.includes("pescatarian")) {
    hardRules.push("Pescatarian: seafood is allowed, but other meats are not.");
    ["beef", "steak", "ground beef", "pork", "bacon", "ham", "chicken", "turkey", "sausage"].forEach((item) =>
      blockedIngredients.add(item),
    );
    blockedCategories.add("meat");
  }

  if (/\bhalal\b/.test(lower)) {
    hardRules.push("Halal: avoid pork and non-halal meat framing.");
    blockedIngredients.add("pork");
    blockedIngredients.add("bacon");
    blockedIngredients.add("ham");
  }

  if (/\bkosher\b/.test(lower)) {
    softRules.push("Kosher-friendly: avoid pork and shellfish, and keep combinations respectful.");
    blockedIngredients.add("pork");
    blockedIngredients.add("bacon");
    blockedIngredients.add("ham");
    addCategory("shellfish");
  }

  if (/\bno red meat\b|\bavoid red meat\b/.test(lower)) {
    hardRules.push("No red meat.");
    addCategory("red_meat");
  }

  if (/\bno beef\b|\bbeef-free\b|\bavoid beef\b/.test(lower)) {
    hardRules.push("No beef.");
    ["beef", "steak", "ground beef"].forEach((item) => blockedIngredients.add(item));
  }

  if (/\bno pork\b|\bpork-free\b|\bavoid pork\b/.test(lower)) {
    hardRules.push("No pork.");
    ["pork", "bacon", "ham", "sausage"].forEach((item) => blockedIngredients.add(item));
  }

  if (/\bno chicken\b|\bchicken-free\b|\bavoid chicken\b/.test(lower)) {
    hardRules.push("No chicken.");
    blockedIngredients.add("chicken");
  }

  if (/\bno turkey\b|\bturkey-free\b|\bavoid turkey\b/.test(lower)) {
    hardRules.push("No turkey.");
    blockedIngredients.add("turkey");
  }

  if (/\bno seafood\b|\bseafood-free\b|\bavoid seafood\b/.test(lower)) {
    hardRules.push("No seafood.");
    blockedCategories.add("seafood");
    addCategory("shellfish");
    ["salmon", "tuna", "fish", "cod", "tilapia"].forEach((item) => blockedIngredients.add(item));
  }

  if (/\bshellfish allergy\b|\ballergic to shellfish\b|\bno shellfish\b/.test(lower)) {
    hardRules.push("Shellfish allergy: absolutely no shellfish.");
    addCategory("shellfish");
  }

  if (/\bdairy[- ]?free\b|\bno dairy\b|\blactose\b/.test(lower)) {
    hardRules.push("Dairy-free.");
    addCategory("dairy");
  }

  if (/\bgluten[- ]?free\b|\bno gluten\b|\bceliac\b/.test(lower)) {
    hardRules.push("Gluten-free.");
    addCategory("gluten");
  }

  if (/\bnut[- ]?free\b|\bno nuts\b|\bpeanut allergy\b/.test(lower)) {
    hardRules.push("Nut-free.");
    addCategory("tree_nuts");
    blockedIngredients.add("peanuts");
    blockedIngredients.add("peanut butter");
  }

  if (/\blow sodium\b|\blow-sodium\b/.test(lower)) {
    softRules.push("Low-sodium: keep salty ingredients restrained and avoid obviously salty meal concepts.");
  }

  const blockedIngredientList = uniqueList(Array.from(blockedIngredients));
  const blockedCategoryList = uniqueList(Array.from(blockedCategories));

  const summaryLines = [
    normalizedInput ? `User-entered diet text: ${normalizedInput}` : "User-entered diet text: None provided.",
    hardRules.length > 0 ? `Hard diet rules: ${hardRules.join(" ")}` : "Hard diet rules: none explicitly detected.",
    softRules.length > 0 ? `Soft diet rules: ${softRules.join(" ")}` : "Soft diet rules: none explicitly detected.",
    blockedCategoryList.length > 0
      ? `Blocked categories: ${blockedCategoryList.join(", ")}`
      : "Blocked categories: none.",
    blockedIngredientList.length > 0
      ? `Blocked ingredients: ${blockedIngredientList.join(", ")}`
      : "Blocked ingredients: none.",
  ];

  return {
    blockedCategories: blockedCategoryList,
    blockedIngredients: blockedIngredientList,
    hardRules,
    normalizedInput,
    promptBlock: summaryLines.join("\n"),
    softRules,
  };
}
