import { homemadeComponents, profileById, type IngredientPortion } from "./allergy-aware-catalog";

export type RecipePart = IngredientPortion | { componentId: string; quantity: number };
export type ReviewedRecipe = {
  id: string; revision: 1; title: string; description: string; kind: "dinner" | "dessert";
  minutes: number; equipment: "Stovetop" | "Oven"; parts: readonly RecipePart[]; steps: readonly string[];
};
const p = (foodId: string, quantity: number): IngredientPortion => ({ foodId, quantity });
const dressing: RecipePart = { componentId: "lemon-parsley-dressing", quantity: 1 };
const tomatoSauce: RecipePart = { componentId: "tomato-garlic-sauce", quantity: 1 };
function recipe(id: string, title: string, description: string, minutes: number, equipment: "Stovetop" | "Oven",
  parts: RecipePart[], steps: string[], kind: "dinner" | "dessert" = "dinner"): ReviewedRecipe {
  return { id, revision: 1, title, description, minutes, equipment, parts, steps, kind };
}
// Authored specifications for engineering review, NOT dietitian/cooking-tested
// or manufacturer-verified recipes. No arbitrary AI text enters their steps.
// Quantities are per person; oil, salt, water and homemade components are explicit.
export const reviewedRecipes: readonly ReviewedRecipe[] = [
  recipe("lemon-chicken", "Lemon chicken with potato wedges and broccoli", "Golden chicken and potato wedges with broccoli and a fresh lemon-parsley dressing.", 40, "Oven",
    [p("chicken",160),p("potato",200),p("broccoli",150),dressing], [
      "Heat the oven to 425°F / 220°C. Cut potatoes into wedges and broccoli into florets. Separate raw chicken from the vegetables and ready-to-eat ingredients.",
      "Reserve half the olive oil and lemon for the dressing. Toss potatoes with the remaining oil and salt; roast for 10 minutes. Add the chicken and broccoli and roast until the chicken reaches 165°F / 74°C on a food thermometer and potatoes are tender.",
      "Combine the reserved oil and lemon with the parsley. Divide all cooked food and dressing evenly among the specified servings. Do not add a bottled dressing or an unlisted garnish.",
    ]),
  recipe("chickpea-tomato-stew", "Chickpea and tomato stew with rice", "A hearty tomato-garlic stew over fluffy rice.", 30, "Stovetop",
    [p("chickpeas",180),p("rice",65),p("water",260),tomatoSauce], [
      "Cook the rice in half the water in a covered saucepan until tender, about 18 minutes.",
      "Dice the tomatoes and onion. Soften the onion and garlic in the olive oil; add tomatoes, oregano, salt and the remaining water. Simmer for 10 minutes.",
      "Add the plain cooked chickpeas and simmer for 5 minutes until steaming throughout. Divide the stew and rice among the specified servings. The homemade sauce uses only the listed ingredients.",
    ]),
  recipe("turkey-cabbage-skillet", "Turkey and cabbage skillet with potatoes", "Savory ground turkey and tender cabbage with paprika potatoes.", 30, "Stovetop",
    [p("turkey",160),p("cabbage",160),p("potato",180),p("onion",50),p("olive-oil",7),p("paprika",1),p("salt",.5),p("water",60)], [
      "Dice the potatoes small, shred the cabbage and chop the onion. Keep raw turkey separate from ready-to-eat ingredients.",
      "Heat the olive oil in a wide skillet. Add potatoes, onion and water; cover and cook for 10 minutes, stirring occasionally.",
      "Add turkey, cabbage, paprika and salt. Break up the turkey and cook until a food thermometer reads 165°F / 74°C and potatoes are tender. Divide among the specified servings.",
    ]),
  recipe("lentil-soup", "Red lentil and carrot soup", "A thick, warming lentil soup with fresh tomato, carrots and cumin.", 35, "Stovetop",
    [p("lentils",85),p("carrot",130),p("tomato",140),p("onion",50),p("garlic",3),p("cumin",1),p("olive-oil",5),p("salt",.5),p("water",400)], [
      "Rinse the dry red lentils. Finely chop carrots, tomatoes, onion and garlic.",
      "Soften the onion and garlic in olive oil in a saucepan. Add all remaining listed ingredients and bring to a simmer.",
      "Cover and simmer for about 25 minutes until lentils and carrots are soft, stirring occasionally. Divide evenly among the specified servings. Do not substitute packaged broth.",
    ]),
  recipe("pork-apple-cabbage", "Pork chops with apple and cabbage", "Pan-cooked pork with sweet apples and tender cabbage.", 30, "Stovetop",
    [p("pork",170),p("apple",120),p("cabbage",180),p("olive-oil",7),p("salt",.5),p("black-pepper",.2),p("water",50)], [
      "Slice the apples and shred the cabbage. Keep raw pork separate. Season the pork with half the listed salt and pepper.",
      "Heat half the olive oil in a skillet. Cook the pork to 145°F / 63°C on a food thermometer, then move it to a clean plate and rest for at least 3 minutes.",
      "Cook the apples and cabbage in the remaining oil, salt, pepper and water until tender. Divide with the rested pork among the specified servings.",
    ]),
  recipe("black-bean-potato-chili", "Black bean and sweet potato chili", "A chunky tomato chili with cumin, peppers and sweet potato.", 35, "Stovetop",
    [p("black-beans",180),p("sweet-potato",180),p("pepper",100),p("water",150),p("cumin",1),p("paprika",1),tomatoSauce], [
      "Dice the sweet potato, pepper, tomato and onion; mince the garlic.",
      "Soften onion and garlic in the olive oil. Add tomato, water, sweet potato, pepper and the listed seasonings. Cover and simmer for 20 minutes until the potato is tender.",
      "Add the plain cooked black beans and simmer for 5 minutes until steaming throughout. Divide among the specified servings. Do not replace the named seasonings with an unverified blend.",
    ]),
  recipe("beef-zucchini", "Garlic beef and zucchini with rice", "A familiar skillet dinner with garlic-seasoned beef, zucchini and rice.", 30, "Stovetop",
    [p("beef",150),p("zucchini",180),p("rice",65),p("water",140),p("garlic",4),p("olive-oil",5),p("salt",.5),p("black-pepper",.2)], [
      "Cook rice in the water in a covered saucepan until tender, about 18 minutes. Dice zucchini and mince garlic.",
      "Heat the oil in a skillet. Add beef and garlic; break up the meat and cook. Add zucchini, salt and pepper and continue cooking until beef reaches 160°F / 71°C on a food thermometer and zucchini is tender.",
      "Divide beef, zucchini and rice among the specified servings. Do not add an unlisted sauce or stock.",
    ]),
  recipe("quinoa-chickpea-salad", "Quinoa and chickpea salad with lemon dressing", "A bright, filling salad with cucumber, tomatoes and homemade lemon-parsley dressing.", 25, "Stovetop",
    [p("quinoa",70),p("water",150),p("chickpeas",140),p("cucumber",100),p("tomato",100),dressing], [
      "Rinse quinoa and cook in the water, covered, for about 15 minutes until tender; set aside briefly to cool.",
      "Dice cucumber and tomatoes. Combine the lemon, olive oil, parsley and salt for the dressing.",
      "Mix the quinoa, plain cooked chickpeas, vegetables and dressing. Divide among the specified servings. Do not use a bottled dressing or add an unlisted ingredient.",
    ]),
  recipe("paprika-chicken", "Paprika chicken with peppers and rice", "A colorful one-pan chicken dinner with sweet peppers and paprika.", 30, "Stovetop",
    [p("chicken-thigh",170),p("pepper",150),p("rice",65),p("water",160),p("onion",50),p("olive-oil",5),p("paprika",1),p("salt",.5)], [
      "Dice the onion and peppers. Cut chicken into small pieces, using separate preparation surfaces from ready-to-eat ingredients.",
      "Heat olive oil in a covered skillet. Brown chicken, then add the remaining listed ingredients. Bring to a simmer and cover.",
      "Cook gently for about 20 minutes until rice is tender and the chicken reaches 165°F / 74°C on a food thermometer. Divide among the specified servings.",
    ]),
  recipe("roasted-chickpea-plate", "Roasted chickpea and vegetable plate", "Roasted carrots, potatoes and chickpeas with a fresh lemon dressing.", 40, "Oven",
    [p("chickpeas",180),p("carrot",150),p("potato",180),dressing], [
      "Heat the oven to 425°F / 220°C. Cut carrots and potatoes into small, evenly sized pieces.",
      "Reserve the lemon and parsley. Toss the vegetables and plain cooked chickpeas with the listed olive oil and salt. Roast for about 30 minutes until potatoes are tender, turning once.",
      "Divide among the specified servings and finish with the reserved lemon and parsley. Do not add an unlisted dressing or garnish.",
    ]),
  recipe("lentil-spinach-dal", "Red lentil and spinach dal with rice", "Creamy red lentils with spinach, cumin and fluffy rice.", 35, "Stovetop",
    [p("lentils",85),p("spinach",100),p("rice",60),p("onion",50),p("garlic",4),p("cumin",1),p("olive-oil",5),p("salt",.5),p("water",500)], [
      "Rinse the rice and lentils separately. Cook rice in 150 ml of the listed water per serving, covered, until tender.",
      "Chop onion and garlic and soften in the olive oil in a saucepan. Add lentils, cumin, salt and the remaining water. Simmer for about 20 minutes until the lentils are soft.",
      "Stir in spinach and simmer for 3 minutes until wilted. Divide the dal and rice among the specified servings. Use only the listed single seasonings.",
    ]),
  recipe("loaded-sweet-potato", "Sweet potato wedges with tomato black beans", "Roasted sweet potato with a rich homemade tomato and black bean topping.", 45, "Oven",
    [p("sweet-potato",220),p("black-beans",180),p("cumin",1),p("water",40),tomatoSauce], [
      "Heat the oven to 425°F / 220°C. Cut sweet potatoes into small wedges. Chop the tomatoes, onion and garlic.",
      "Toss wedges with half the listed oil and roast on a tray. Put the remaining ingredients in a separate covered ovenproof dish and bake alongside for about 35 minutes, until the potatoes are tender and beans are steaming throughout.",
      "Stir the tomato and black bean mixture and divide over the sweet potatoes among the specified servings. Do not add unlisted toppings.",
    ]),
  recipe("salmon-green-beans", "Lemon salmon with potatoes and green beans", "Tender salmon with potato wedges and lemon-parsley vegetables.", 40, "Oven",
    [p("salmon",160),p("potato",180),p("green-beans",150),dressing], [
      "Heat oven to 425°F / 220°C. Cut potatoes into small wedges and trim green beans; keep raw fish separate.",
      "Reserve lemon and parsley. Toss potatoes with half the oil and salt and roast for 15 minutes. Add salmon and green beans with the remaining oil and salt and cook until the fish reaches 145°F / 63°C on a food thermometer and vegetables are tender.",
      "Divide among the specified servings and finish with the reserved lemon and parsley. No alternative fish or bottled sauce is implied by this specification.",
    ]),
  recipe("egg-potato-skillet", "Spinach and potato egg skillet", "Soft-set eggs over tender potatoes and spinach.", 25, "Stovetop",
    [p("egg",2),p("potato",160),p("spinach",90),p("olive-oil",5),p("salt",.5),p("water",50)], [
      "Cut potatoes into small cubes. Heat the oil in a lidded skillet; add potatoes and water and cover for about 12 minutes until tender.",
      "Add spinach and salt and stir until wilted. Crack the listed eggs into a separate clean bowl, then pour over the vegetables.",
      "Cover and cook until the egg mixture reaches 160°F / 71°C on a food thermometer. Divide among the specified servings. Do not add unlisted cheese or milk.",
    ]),
  recipe("cinnamon-apples", "Cinnamon baked apples", "Warm apple wedges with a light cinnamon-sugar coating.", 25, "Oven",
    [p("apple",180),p("sugar",8),p("cinnamon",.5),p("water",20)], [
      "Heat oven to 400°F / 200°C. Core the apples and slice into wedges.",
      "Place apples in a baking dish with the water; sprinkle with the sugar and cinnamon.",
      "Bake about 20 minutes until tender. Divide among the specified servings. Serve as listed, without an unlisted topping.",
    ], "dessert"),
  recipe("berry-oat-crisp", "Blueberry oat crisp", "Juicy blueberries under a crisp oat and cinnamon topping.", 35, "Oven",
    [p("berries",120),p("oats",35),p("sugar",12),p("olive-oil",8),p("cinnamon",.5),p("water",15)], [
      "Heat oven to 375°F / 190°C. Place blueberries and water in a small baking dish.",
      "Mix the rolled oats, sugar, olive oil and cinnamon; scatter over the berries.",
      "Bake for about 25 minutes until bubbling and lightly browned. Divide among the specified servings. Oats are not certified against grain cross-contact.",
    ], "dessert"),
  recipe("cocoa-bananas", "Warm cocoa bananas", "Soft banana slices with a simple cocoa sauce.", 10, "Stovetop",
    [p("banana",140),p("cocoa",6),p("sugar",8),p("water",25)], [
      "Slice the bananas. Mix the unsweetened cocoa powder, sugar and water in a small saucepan.",
      "Warm gently, stirring until the sugar dissolves and the sauce is smooth.",
      "Add the banana slices and warm for 2 minutes, then divide among the specified servings. Do not substitute a chocolate drink mix or add unlisted toppings.",
    ], "dessert"),
  recipe("poached-pears", "Cinnamon poached pears", "Tender pear slices in a light cinnamon syrup.", 25, "Stovetop",
    [p("pear",180),p("sugar",10),p("cinnamon",.5),p("water",100)], [
      "Core the pears and cut into thick slices.",
      "Bring water, sugar and cinnamon to a simmer in a saucepan and add the pears.",
      "Cover and simmer gently for about 15 minutes until tender. Divide pears and syrup among the specified servings, without an unlisted topping.",
    ], "dessert"),
];

export function recipeById(id: string) { return reviewedRecipes.find(r => r.id === id); }
export function expandRecipeParts(recipe: ReviewedRecipe): IngredientPortion[] {
  const totals = new Map<string, number>();
  for (const part of recipe.parts) {
    const parts = "foodId" in part ? [part] : homemadeComponents[part.componentId]?.parts.map(p => ({foodId:p.foodId,quantity:p.quantity*part.quantity}));
    if (!parts) throw Error("Unknown server-owned component");
    for (const p of parts) {
      if (!profileById(p.foodId) || !Number.isFinite(p.quantity) || p.quantity <= 0) throw Error("Invalid server-owned ingredient");
      totals.set(p.foodId, (totals.get(p.foodId) ?? 0) + p.quantity);
    }
  }
  return [...totals].map(([foodId, quantity]) => ({foodId,quantity}));
}
