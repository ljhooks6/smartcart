type GeneratePromptArgs = {
  adventureGuidance: string;
  adventureLevel: string;
  applyUpgrades: boolean;
  budget: number;
  budgetTightness?: boolean;
  combinedPantryItems: string;
  dietaryPromptBlock: string;
  existingMeals: string;
  fullyStocked: string[];
  householdSize: number;
  includeDessert: boolean;
  mustHavePromptBlock: string;
  restock: string[];
  runningLow: string[];
  selectedEquipment: string;
};

type ReplacePromptArgs = {
  adventureGuidance: string;
  adventureLevel: string;
  blockedTitles: string[];
  budget: number;
  combinedPantryItems: string;
  currentMealsContext: string;
  dietaryPromptBlock: string;
  existingMeals: string;
  householdSize: number;
  mustHavePromptBlock: string;
  prepTime?: string;
  rejectedMealTitle: string;
  selectedEquipment: string;
};

const GENERATE_JSON_SHAPE = `{
  "meals": [
    {
      "day": "Day 1",
      "name": "string",
      "servings": number,
      "notes": "string",
      "ingredients": [
        {
          "name": "string",
          "amount": "string",
          "price": number
        }
      ]
    }
  ],
  "estimated_total_cost": number,
  "budget_summary": "string",
  "upgrade_available": boolean,
  "desserts": [
    {
      "title": "string",
      "description": "string",
      "ingredients": [
        {
          "name": "string",
          "amount": "string",
          "price": number
        }
      ]
    }
  ]
}`;

const REPLACE_JSON_SHAPE = `{
  "title": "string",
  "description": "string",
  "prepTime": number,
  "ingredients": ["string"]
}`;

function joinPromptSections(sections: Array<string | string[]>) {
  return sections
    .flatMap((section) => (Array.isArray(section) ? section : [section]))
    .map((section) => section.trim())
    .filter(Boolean)
    .join("\n");
}

export function buildGenerateListPrompts({
  adventureGuidance,
  adventureLevel,
  applyUpgrades,
  budget,
  budgetTightness,
  combinedPantryItems,
  dietaryPromptBlock,
  existingMeals,
  fullyStocked,
  householdSize,
  includeDessert,
  mustHavePromptBlock,
  restock,
  runningLow,
  selectedEquipment,
}: GeneratePromptArgs) {
  const introSection = [
    "You are an expert, budget-conscious logistical meal planner.",
    "Create 8 meal suggestions that strictly adhere to the user's budget, diet, household size, and pantry items.",
  ];

  const corePlanningRules = [
    "- Always generate a lean, frugal list first unless the user explicitly asks to apply upgrades.",
    "- Return exactly 8 meals.",
    "- Respect the budget strictly.",
    "- Respect the diet exactly.",
    "- This app is for families. EVERY dinner meal MUST contain a substantial protein source such as chicken, beef, seafood, pork, tofu, or heavy beans. NEVER generate a meal that is just carbs and sauce.",
    "- CRITICAL RULE: Every generated dinner MUST be a complete, balanced meal. Do not suggest standalone proteins or incomplete dishes (for example \"Baked Chicken\"). You must suggest fully composed plates (for example \"Baked Chicken with Roasted Potatoes and Green Beans\" or a complete one-pan dish like \"Beef and Broccoli Stir-Fry over Rice\"). If you suggest a protein, you MUST include a complementary side dish in the meal title.",
    `- CRITICAL: Do NOT suggest, generate, or return any of the following meals: ${existingMeals || "None provided"}.`,
    `- CRITICAL: You may ONLY generate recipes that can be prepared using the following equipment: ${selectedEquipment}. Do not suggest recipes requiring unselected hardware.`,
  ];

  const varietyRules = [
    "- CRITICAL RULE: BALANCED PROTEIN VARIETY. You are generating 8 meals. Limit any single main protein (for example chicken) to a MAXIMUM of 2 meals. You MUST use at least 3 to 4 different main proteins. Do not let the user's pantry limit this rule.",
    "- CRITICAL RULE: Pantry items are helpful context, not a restriction. You are allowed to introduce additional proteins that are not already in the pantry and place them in the meal ingredients so the menu stays varied.",
    "- CRITICAL RULE: Stop defaulting to cheap LLM tropes like Chickpea Curry, Lentil Soup, or Bean Tacos unless the user explicitly marked those items as owned in their pantry. You must prioritize the actual proteins the user selected. Do not force legumes into the menu just to keep the budget low. Be creative with the ingredients provided.",
    "- CRITICAL RULE: FLAVOR MANDATE. Every recipe must explicitly include at least 3 herbs, spices, or aromatics.",
    "- CRITICAL RULE: FLAVOR VARIETY. Do not let the same spice, herb, or aromatic dominate the entire week. Repeating the same signature flavor cue in multiple meal titles is forbidden. If cumin appears in one title, do not keep using cumin in other titles unless it is truly essential.",
    "- CRITICAL RULE: TITLE VARIETY. Do not repeat the same cuisine word, spice word, or meal format over and over in the meal names. Avoid titles that feel templated.",
  ];

  const pantryAndIngredientRules = [
    "- Reuse pantry items whenever possible.",
    "- Use pantry items from the \"fully stocked\", \"running low\", and \"restock\" lists to shape the meals.",
    "- Do not generate a root-level grocery list.",
    "- Every meal must include its own localized \"ingredients\" array.",
    "- Each ingredient object must use this exact format:",
    "  - { \"name\": \"Red Bell Peppers\", \"amount\": \"2\", \"price\": 3.00 }",
    "- Only include ingredients required for that specific meal inside that meal's ingredients array.",
    "- You MUST be specific with ingredient names (for example \"Red Bell Peppers\" or \"Roma Tomatoes\", not just \"Peppers\").",
    "- NEVER append conversational text like \"(assumed purchase)\" to ingredient names.",
    "- BANNED: Any text like \"1 item\", \"(assumed purchase)\", or \"to taste\". If an amount is small, use \"1 pinch\" or \"1 tsp\".",
    "- You are a professional grocery curator. You are FORBIDDEN from using generic names. You must specify types: \"Red Bell Peppers\", \"English Cucumber\", \"Honeycrisp Apples\", \"80/20 Ground Beef\". Every ingredient MUST have a realistic store-bought quantity (for example \"16oz jar\", \"1 lb pack\", \"Bundle of 5\").",
    "- Strict Consistency: Every ingredient listed inside a meal's ingredients array must be explicitly used in that meal's title or notes.",
    "- No ingredient or pantry item should ever be priced below $1.00. Even tiny-use items must reflect the cost of buying a standard store container.",
  ];

  const writingAndDessertRules = [
    "- Write a rich, helpful 2-3 sentence description for every dinner meal and every dessert option. Do not use one-sentence descriptions.",
    includeDessert
      ? "- If includeDessert is true, evaluate the remaining budget after planning the 8 meals. If there is room, generate exactly TWO dessert options for the week. Prioritize utilizing the user's pantry baking staples to keep costs low. If the budget is too tight to afford the 8 meals AND two dessert options, return an empty \"desserts\" array."
      : "- If includeDessert is false, return an empty \"desserts\" array.",
    "- Every dessert option must include its own localized \"ingredients\" array using the exact same ingredient format as meals.",
    "- Generate only sweet, sugary desserts. Do not suggest savory items, biscuits, or bread-based side dishes like cheddar biscuits or spinach biscuits.",
  ];

  const adventureRules = [
    "- Adventure Level enforcement: if the user selected \"Try new cuisines\" or \"Mix it up\", you MUST generate diverse, global, or creative recipes and strictly avoid generic fallbacks like \"Vegetable Stir-fry\", plain pasta, or repetitive default meals. If the user selected \"Stick to basics\", keep the meals familiar and approachable.",
    "- CRITICAL: You must strictly tailor the cuisine types to the user's adventureLevel preference.",
    "- If Stick to basics: Generate classic, familiar comfort foods. You MUST prioritize styles like Soul Food, classic BBQ, traditional American fare (for example burgers and fries, pork chops), and simple homestyle meals. STRICTLY avoid trendy bowls or complex international dishes.",
    "- If Mix it up: Provide a balanced 50/50 split. Include some hearty homestyle comfort food alongside approachable global dishes.",
    "- If Try new cuisines: Focus entirely on diverse, authentic global flavors (for example Mediterranean, Asian, Indian, regional Mexican).",
    "- CRITICAL ADVENTURE LEVEL DISTRIBUTION:",
    "  - Keep it simple / Stick to basics: At least 5 of the 8 meals must be familiar weeknight staples. Simple meals like burgers and fries, chicken wraps, spaghetti and meatballs, tacos, baked pasta, meatloaf, or sheet-pan chicken are absolutely allowed and encouraged when they fit the rules.",
    "  - Mix it up: Build a clear split with about half familiar comfort meals and half more varied cuisine or format choices.",
    "  - Try something new: Keep only 1 or 2 familiar anchor meals at most. The rest should clearly explore different cuisines, proteins, or formats.",
    `- ${adventureGuidance}`,
  ];

  const budgetRules = [
    "- Budget Tightness enforcement: if budgetTightness is false, you MUST NOT force heavy ingredient overlap. Prioritize culinary variety, distinct flavor profiles, and different lead ingredients across the week. Only force strong cross-utilization and ingredient overlap if budgetTightness is true.",
    "- If budgetTightness is false, you MUST utilize between 50% and 65% of the user's total budget. Do not go below 50% of the budget. You must select premium, high-quality ingredients to hit this minimum threshold. Do not exceed 65% of the total budget.",
    "- CRITICAL: When budgetTightness is false, you MUST perform a mathematical check before responding. The total sum of all meal ingredient prices must fall between 50% and 65% of the user's total budget. If your total is below 50%, you must upgrade to premium ingredients or upscale the recipes until you hit that 50% minimum threshold.",
    "- Pay close attention to the budget. If the plan is far below the target budget, use higher-quality ingredient upgrades to better maximize the budget, such as fresh herbs instead of dried herbs or a better-quality protein.",
    "- Include a final budget note that compares the estimated total cost against the target budget.",
    "- If the estimated total cost is less than 80% of the user's maximum budget, set \"upgrade_available\" to true. Otherwise set it to false.",
  ];

  const safetyAndOutputRules = [
    "- DIETARY SAFETY: Treat blocked ingredients and blocked categories as hard bans. Never include them in any meal title, notes, or ingredients array.",
    `- ${mustHavePromptBlock}`,
    "- Return valid JSON only.",
    "- Use this exact JSON shape:",
    GENERATE_JSON_SHAPE,
  ];

  const systemPrompt = joinPromptSections([
    introSection,
    "",
    "Rules:",
    corePlanningRules,
    varietyRules,
    pantryAndIngredientRules,
    writingAndDessertRules,
    adventureRules,
    budgetRules,
    safetyAndOutputRules,
  ]);

  const userPromptSections = [
    "Build 8 meal suggestions with localized ingredients using these inputs:",
    "",
    `Budget: ${budget}`,
    `Diet: ${dietaryPromptBlock.includes("User-entered diet text:") ? dietaryPromptBlock.split("\n")[0].replace("User-entered diet text: ", "") : "None provided"}`,
    `Household Size: ${householdSize}`,
    `Pantry Items: ${combinedPantryItems || "None provided"}`,
    `Fully Stocked Pantry Items: ${fullyStocked.length > 0 ? fullyStocked.join(", ") : "None provided"}`,
    `Running Low Pantry Items: ${runningLow.length > 0 ? runningLow.join(", ") : "None provided"}`,
    `Restock Pantry Items: ${restock.length > 0 ? restock.join(", ") : "None provided"}`,
    `Include Dessert: ${includeDessert ? "Yes" : "No"}`,
    `Adventure Level: ${adventureLevel || "No preference provided"}`,
    `Budget Tightness: ${typeof budgetTightness === "boolean" ? (budgetTightness ? "ON" : "OFF") : "Not provided"}`,
    `Available Kitchen Equipment: ${selectedEquipment}`,
    "Protein Variety Reminder: Even if the pantry only includes chicken, you must still diversify across at least 3 to 4 different main proteins and cap chicken at 2 meals.",
    dietaryPromptBlock,
    mustHavePromptBlock,
    adventureGuidance,
    "",
    applyUpgrades
      ? "The user has chosen to upgrade. Rewrite this plan using premium, high-quality ingredients (for example fresh herbs, better proteins, organic ingredients) to get as close to the max budget as possible."
      : "Do not apply premium upgrades unless the 80% rule indicates an upgrade opportunity.",
  ];

  return {
    systemPrompt,
    userPrompt: joinPromptSections(userPromptSections),
  };
}

export function buildReplaceMealPrompts({
  adventureGuidance,
  adventureLevel,
  blockedTitles,
  budget,
  combinedPantryItems,
  currentMealsContext,
  dietaryPromptBlock,
  existingMeals,
  householdSize,
  mustHavePromptBlock,
  prepTime,
  rejectedMealTitle,
  selectedEquipment,
}: ReplacePromptArgs) {
  const systemPrompt = joinPromptSections([
    "You are an expert budget-conscious meal planner helping replace a single rejected dinner.",
    "",
    "Rules:",
    [
      "- Generate exactly ONE replacement meal.",
      "- The replacement must feel clearly different from the rejected meal title in flavor profile, format, and primary ingredients.",
      `- CRITICAL: Do NOT suggest, generate, or return any of the following meals: ${existingMeals || "None provided"}.`,
      `- CURRENT MENU CONTEXT: The user already has these meals: ${currentMealsContext || "None provided"}. STRICT RULE: Provide a completely different main protein and flavor profile from the majority of the current menu.`,
      `- RECENTLY REJECTED OR BLOCKED TITLES: ${blockedTitles.join(", ") || "None provided"}.`,
      `- CRITICAL: You may ONLY generate recipes that can be prepared using the following equipment: ${selectedEquipment}. Do not suggest recipes requiring unselected hardware.`,
      "- Respect the user's budget, diet, household size, pantry items, and prep-time preference.",
      "- DIETARY SAFETY: Treat blocked ingredients and blocked categories as hard bans. Never include them in the replacement title, description, or ingredients.",
      `- ${mustHavePromptBlock}`,
      "- Adventure Level enforcement:",
      "  - Stick to basics: choose a familiar meal style such as burgers and fries, wraps, tacos, pasta, baked chicken, or other approachable weeknight staples.",
      "  - Mix it up: choose something distinct but still approachable.",
      "  - Try new cuisines: choose a clearly different cuisine or flavor lane from the rejected meal and the current menu.",
      `- ${adventureGuidance}`,
      "- CRITICAL REPLACEMENT DISTINCTNESS: the replacement must differ from the rejected meal in at least TWO of these dimensions: main protein, cuisine lane, cooking format, or starch/side pairing.",
      "- CRITICAL REPLACEMENT SAFETY: never return the rejected meal again, never return a tiny rename of the rejected meal, and never return a title that is already present in the current menu context.",
      "- Use pantry items where reasonable.",
      "- Keep the replacement practical for a weeknight home cook.",
      "- Return valid JSON only.",
      "- Use this exact JSON shape:",
      REPLACE_JSON_SHAPE,
    ],
  ]);

  const userPrompt = joinPromptSections([
    "Generate one replacement meal with these constraints:",
    "",
    `Budget: ${budget}`,
    `Diet: ${dietaryPromptBlock.includes("User-entered diet text:") ? dietaryPromptBlock.split("\n")[0].replace("User-entered diet text: ", "") : "None provided"}`,
    `Household Size: ${householdSize}`,
    `Pantry Items: ${combinedPantryItems || "None provided"}`,
    `Rejected Meal Title: ${rejectedMealTitle}`,
    `Prep Time Preference: ${prepTime || "No preference provided"}`,
    `Adventure Level: ${adventureLevel || "No preference provided"}`,
    `Available Kitchen Equipment: ${selectedEquipment}`,
    dietaryPromptBlock,
    mustHavePromptBlock,
    adventureGuidance,
    "",
    `The new meal must be distinctly different from "${rejectedMealTitle}".`,
  ]);

  return {
    systemPrompt,
    userPrompt,
  };
}

