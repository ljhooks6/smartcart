type GeneratePromptArgs = {
  adventureGuidance: string;
  adventureLevel: string;
  applyUpgrades: boolean;
  avoidancePromptBlock: string;
  budget: number;
  combinedPantryItems: string;
  dietaryPromptBlock: string;
  existingMeals: string;
  fullyStocked: string[];
  householdSize: number;
  includeDessert: boolean;
  mustHavePromptBlock: string;
  prepTime?: string;
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
  avoidancePromptBlock: string;
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

function buildEquipmentGuidance(selectedEquipment: string) {
  const equipment = selectedEquipment.toLowerCase();
  const guidance: string[] = [];

  if (equipment.includes("air fryer")) {
    guidance.push(
      "- If Air Fryer is selected, strongly consider featuring at least 1 dinner that clearly uses the air fryer in the title or notes when it fits the user's adventure level and budget.",
    );
  }

  if (equipment.includes("slow cooker")) {
    guidance.push(
      "- If Slow Cooker is selected, strongly consider featuring at least 1 dinner that clearly uses the slow cooker or crockpot in the title or notes when it fits the user's prep-time preference.",
    );
  }

  if (equipment.includes("grill")) {
    guidance.push(
      "- If Grill is selected, you may include a grilled dinner and should use the grill for at least 1 meal when it fits the adventure level, season, and budget.",
    );
  }

  if (equipment.includes("blender")) {
    guidance.push(
      "- If Blender is selected, you may use it for sauces, dressings, marinades, or blended soup bases. It is acceptable to feature at least 1 dinner with a blended component when it fits naturally.",
    );
  }

  return guidance;
}

export function buildGenerateListPrompts({
  adventureGuidance,
  adventureLevel,
  applyUpgrades,
  avoidancePromptBlock,
  budget,
  combinedPantryItems,
  dietaryPromptBlock,
  existingMeals,
  fullyStocked,
  householdSize,
  includeDessert,
  mustHavePromptBlock,
  prepTime,
  restock,
  runningLow,
  selectedEquipment,
}: GeneratePromptArgs) {
  const equipmentGuidance = buildEquipmentGuidance(selectedEquipment);

  const introSection = [
    "You are an expert, budget-conscious logistical meal planner.",
    "Create 7 dinner meal suggestions that strictly adhere to the user's budget, diet, household size, and pantry items.",
  ];

  const corePlanningRules = [
    "- Always generate a lean, frugal list first unless the user explicitly asks to apply upgrades.",
    "- Return exactly 7 dinner meals.",
    "- Respect the budget strictly.",
    "- Respect the diet exactly.",
    `- Respect the user's prep-time preference: ${prepTime || "No preference provided"}.`,
    "- This app is for families. EVERY dinner meal MUST contain a substantial protein source such as chicken, beef, seafood, pork, tofu, or heavy beans. NEVER generate a meal that is just carbs and sauce.",
    "- CRITICAL RULE: Every generated dinner MUST be a complete, balanced meal. Do not suggest standalone proteins or incomplete dishes (for example \"Baked Chicken\"). You must suggest fully composed plates (for example \"Baked Chicken with Roasted Potatoes and Green Beans\" or a complete one-pan dish like \"Beef and Broccoli Stir-Fry over Rice\"). If you suggest a protein, you MUST include a complementary side dish in the meal title.",
    `- CRITICAL: Do NOT suggest, generate, or return any of the following meals: ${existingMeals || "None provided"}.`,
    `- CRITICAL: You may ONLY generate recipes that can be prepared using the following equipment: ${selectedEquipment}. Do not suggest recipes requiring unselected hardware.`,
    ...equipmentGuidance,
  ];

  const varietyRules = [
    "- CRITICAL RULE: BALANCED PROTEIN VARIETY. You are generating 7 meals. Limit any single main protein (for example chicken) to a MAXIMUM of 2 meals. You MUST use at least 3 to 4 different main proteins. Do not let the user's pantry limit this rule.",
    "- CRITICAL RULE: Pantry items are helpful context, not a restriction. You are allowed to introduce additional proteins that are not already in the pantry and place them in the meal ingredients so the menu stays varied.",
    "- CRITICAL RULE: Stop defaulting to cheap LLM tropes like Chickpea Curry, Lentil Soup, or Bean Tacos unless the user explicitly marked those items as owned in their pantry. You must prioritize the actual proteins the user selected. Do not force legumes into the menu just to keep the budget low. Be creative with the ingredients provided.",
    "- CRITICAL RULE: FLAVOR MANDATE. Every recipe must explicitly include at least 3 herbs, spices, or aromatics.",
    "- CRITICAL RULE: FLAVOR VARIETY. Do not let the same spice, herb, or aromatic dominate the entire week. Repeating the same signature flavor cue in multiple meal titles is forbidden. If cumin appears in one title, do not keep using cumin in other titles unless it is truly essential.",
    "- CRITICAL RULE: TITLE VARIETY. Do not repeat the same cuisine word, spice word, or meal format over and over in the meal names. Avoid titles that feel templated.",
    "- CRITICAL RULE: FORMAT VARIETY. Do not let more than 2 meals use the same title family such as stir-fry, skillet, curry, bowl, wrap, sheet-pan, pasta bake, or tacos.",
    "- CRITICAL RULE: CUISINE VARIETY. Spread the week across distinct flavor lanes. Do not let the menu read like seven variations of the same seasoning profile.",
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
      ? "- If includeDessert is true, evaluate the remaining budget after planning the 7 dinners. If there is room, generate up to TWO dessert options for the week. Prioritize utilizing the user's pantry baking staples to keep costs low. If the budget is too tight to afford the 7 dinners and dessert options, return an empty \"desserts\" array."
      : "- If includeDessert is false, return an empty \"desserts\" array.",
    "- Every dessert option must include its own localized \"ingredients\" array using the exact same ingredient format as meals.",
    "- Generate only sweet, sugary desserts. Do not suggest savory items, biscuits, or bread-based side dishes like cheddar biscuits or spinach biscuits.",
    "- DESSERT VARIETY RULE: If you return two desserts, they must feel clearly different in category and flavor base. Do not return two versions of the same dessert family.",
    "- Use different dessert lanes such as cookies, bars, cobbler, pudding, cheesecake, pie, crisp, icebox dessert, or cake. Avoid repetitive chocolate-only or cinnamon-only duplication unless the pantry forces it.",
    "- Avoid repeating the same signature dessert word or dominant flavor in both dessert titles.",
  ];

  const adventureRules = [
    "- Adventure Level enforcement: if the user selected \"Try new cuisines\" or \"Mix it up\", you MUST generate diverse, global, or creative recipes and strictly avoid generic fallbacks like \"Vegetable Stir-fry\", plain pasta, or repetitive default meals. If the user selected \"Stick to basics\", keep the meals familiar and approachable.",
    "- CRITICAL: You must strictly tailor the cuisine types to the user's adventureLevel preference.",
    "- If Stick to basics: Generate classic, familiar comfort foods. You MUST prioritize styles like Soul Food, classic BBQ, traditional American fare (for example burgers and fries, pork chops), and simple homestyle meals. STRICTLY avoid trendy bowls or complex international dishes.",
    "- If Mix it up: Provide a balanced 50/50 split. Include some hearty homestyle comfort food alongside approachable global dishes.",
    "- If Try new cuisines: Focus entirely on diverse, authentic global flavors (for example Mediterranean, Asian, Indian, regional Mexican).",
    "- CRITICAL ADVENTURE LEVEL DISTRIBUTION:",
    "  - Keep it simple / Stick to basics: At least 4 of the 7 meals must be familiar weeknight staples. Simple meals like burgers and fries, chicken or turkey burgers and fries, chicken wraps, spaghetti and meatballs, tacos, baked pasta, meatloaf, or sheet-pan chicken are absolutely allowed and encouraged when they fit the rules.",
    "  - Mix it up: Build a clear split with about half familiar comfort meals and half more varied cuisine or format choices.",
    "  - Try something new: Keep only 1 or 2 familiar anchor meals at most. The rest should clearly explore different cuisines, proteins, or formats.",
    "- CLASSIC MEAL ALLOWLIST: burgers and fries, turkey burgers, chicken burgers, chicken wraps, spaghetti and meatballs, baked ziti, quesadillas, tacos, meatloaf, BBQ chicken plates, pork chops with sides, sheet-pan dinners, fried chicken with sides, baked or skillet mac and cheese with protein, and mashed-potato comfort plates are all valid meal concepts when they match the user's preferences.",
    "- COMFORT-FOOD BALANCE: it is healthy for the menu to occasionally include one comfort-food anchor like fried chicken, mashed potatoes, or mac and cheese, especially for Stick to basics and Mix it up, but do not let multiple meals become heavy copies of the same soul-food lane.",
    "- IMPORTANT: Do not avoid simple classics just because they sound common. Familiar meals are often the correct answer, especially for Stick to basics and Mix it up.",
    `- ${adventureGuidance}`,
  ];

  const budgetRules = [
    "- Keep the full plan budget-conscious without making every meal feel like the same cheap fallback.",
    "- Prioritize practical grocery overlap where it helps, but do not sacrifice variety just to reuse the same ingredients repeatedly.",
    "- Include a final budget note that compares the estimated total cost against the target budget.",
    "- If the estimated total cost is less than 80% of the user's maximum budget, set \"upgrade_available\" to true. Otherwise set it to false.",
  ];

  const safetyAndOutputRules = [
    "- DIETARY SAFETY: Treat blocked ingredients and blocked categories as hard bans. Never include them in any meal title, notes, or ingredients array.",
    `- ${mustHavePromptBlock}`,
    `- ${avoidancePromptBlock}`,
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
    "Build 7 dinner meal suggestions with localized ingredients using these inputs:",
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
    `Prep Time Preference: ${prepTime || "No preference provided"}`,
    `Available Kitchen Equipment: ${selectedEquipment}`,
    "Protein Variety Reminder: Even if the pantry only includes chicken, you must still diversify across at least 3 to 4 different main proteins and cap chicken at 2 meals.",
    dietaryPromptBlock,
    mustHavePromptBlock,
    avoidancePromptBlock,
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
  avoidancePromptBlock,
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
      `- ${avoidancePromptBlock}`,
      "- Adventure Level enforcement:",
      "  - Stick to basics: choose a familiar meal style such as burgers and fries, chicken or turkey burgers, wraps, tacos, pasta, baked chicken, comfort-food plates, or other approachable weeknight staples.",
      "  - Mix it up: choose something distinct but still approachable.",
      "  - Try new cuisines: choose a clearly different cuisine or flavor lane from the rejected meal and the current menu.",
      `- ${adventureGuidance}`,
      "- CRITICAL REPLACEMENT DISTINCTNESS: the replacement must differ from the rejected meal in at least TWO of these dimensions: main protein, cuisine lane, cooking format, or starch/side pairing.",
      "- CRITICAL REPLACEMENT SAFETY: never return the rejected meal again, never return a tiny rename of the rejected meal, and never return a title that is already present in the current menu context.",
      "- CRITICAL REPLACEMENT VARIETY: if the rejected meal was a burger, wrap, taco, pasta, bowl, curry, stir-fry, skillet, or sheet-pan meal, do not return the same meal family unless the user explicitly asked for very simple staples and even then change the protein and side pairing substantially.",
      "- CLASSIC REPLACEMENTS ARE ALLOWED when they fit the adventure level. Burgers, wraps, pasta, tacos, quesadillas, BBQ plates, baked chicken dinners, and occasional comfort-food plates are all valid replacements if they are clearly different from the rejected or existing meals.",
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
    avoidancePromptBlock,
    adventureGuidance,
    "",
    `The new meal must be distinctly different from "${rejectedMealTitle}".`,
  ]);

  return {
    systemPrompt,
    userPrompt,
  };
}
