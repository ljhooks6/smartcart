import { homemadeComponents, profileById, type IngredientPortion } from "./allergy-aware-catalog";

export type RecipePart = IngredientPortion | { componentId: string; quantity: number };
export type ReviewedRecipe = {
  id: string; revision: number; title: string; description: string; kind: "dinner" | "dessert";
  family: string; reviewStatus: "engineering-candidate";
  requiredEquipment: readonly ("Stovetop" | "Oven")[];
  minutes: number; equipment: "Stovetop" | "Oven"; parts: readonly RecipePart[]; steps: readonly string[];
};
const p = (foodId: string, quantity: number): IngredientPortion => ({ foodId, quantity });
const dressing: RecipePart = { componentId: "lemon-parsley-dressing", quantity: 1 };
const tomatoSauce: RecipePart = { componentId: "tomato-garlic-sauce", quantity: 1 };
const existingFamilies: Record<string, string> = {
  "lemon-chicken":"roast-chicken-dinner", "chickpea-tomato-stew":"chickpea-stew", "turkey-cabbage-skillet":"ground-meat-vegetable-skillet",
  "lentil-soup":"lentil-soup", "pork-apple-cabbage":"pork-chop-dinner", "black-bean-potato-chili":"bean-chili",
  "beef-zucchini":"ground-meat-vegetable-skillet", "quinoa-chickpea-salad":"grain-legume-salad", "paprika-chicken":"chicken-rice-skillet",
  "roasted-chickpea-plate":"roasted-legume-vegetable-plate", "lentil-spinach-dal":"lentil-dal", "loaded-sweet-potato":"loaded-potato",
  "salmon-green-beans":"roast-fish-dinner", "egg-potato-skillet":"potato-egg-skillet",
  "cinnamon-apples":"baked-fruit", "berry-oat-crisp":"fruit-crisp", "cocoa-bananas":"warm-fruit-sauce", "poached-pears":"poached-fruit",
};
function recipe(id: string, title: string, description: string, minutes: number, equipment: "Stovetop" | "Oven",
  parts: RecipePart[], steps: string[], kind: "dinner" | "dessert" = "dinner", family = existingFamilies[id] ?? id,
  requiredEquipment: ("Stovetop" | "Oven")[] = [equipment]): ReviewedRecipe {
  return { id, revision: 1, title, description, minutes, equipment, parts, steps, kind, family, requiredEquipment, reviewStatus:"engineering-candidate" };
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
  // Additional engineering candidates. Timing, yields and eating quality still
  // require practical cooking and qualified review; this is not a release manifest.
  recipe("stuffed-peppers", "Quinoa and black bean stuffed peppers", "Pepper halves filled with quinoa, black beans and fresh tomato.", 50, "Oven",
    [p("pepper",220),p("quinoa",55),p("water",160),p("black-beans",130),p("tomato",100),p("onion",30),p("olive-oil",6),p("cumin",1),p("salt",.5)], [
      "Heat the oven to 400°F / 200°C. Halve and seed the peppers; brush with half the oil and bake cut-side up for 15 minutes.",
      "Rinse quinoa. In a saucepan soften chopped onion in remaining oil; add quinoa, water, chopped tomato, cumin and salt. Cover and simmer for 15 minutes; stir in the plain cooked beans.",
      "Fill peppers with the quinoa mixture and bake for 15–20 minutes until tender and the center is steaming. Divide all listed food among the specified servings; no cheese or bottled sauce is included.",
    ], "dinner", "stuffed-peppers", ["Oven","Stovetop"]),
  recipe("turkey-meatballs", "Turkey meatballs in tomato sauce with potatoes", "Oat-bound turkey meatballs simmered in homemade tomato sauce.", 45, "Stovetop",
    [p("turkey",160),p("oats",20),p("potato",180),p("water",250),tomatoSauce], [
      "Cut potatoes into small cubes and simmer in most of the water in a covered saucepan until tender, about 18 minutes; reserve the cooking liquid with the potatoes.",
      "Mix raw turkey with rolled oats and a little of the listed water; form small meatballs using a separate raw-meat surface. Soften the sauce onion and garlic in the oil; add chopped tomato, oregano, salt and remaining water.",
      "Add meatballs, cover and gently simmer, turning carefully, until each reaches 165°F / 74°C on a food thermometer, about 15–20 minutes. Divide with the potatoes. No egg, breadcrumbs or unlisted sauce is included.",
    ], "dinner", "meatballs"),
  recipe("chicken-cabbage-rolls", "Chicken and rice cabbage rolls", "Tender cabbage parcels with chicken, rice and homemade tomato sauce.", 60, "Oven",
    [p("chicken",150),p("cabbage",220),p("rice",50),p("water",250),tomatoSauce], [
      "Heat oven to 375°F / 190°C. Simmer rice in half the water until tender. Soften large cabbage leaves in a separate pan of plain hot water; drain that blanching water. Chop any small leaves.",
      "Finely dice raw chicken separately. Divide chicken, cooked rice and chopped cabbage into the softened leaves, roll and place seam-side down in an ovenproof dish. Combine the listed chopped tomato, onion, garlic, oil, oregano, salt and remaining water around the rolls.",
      "Cover and bake for about 35 minutes, until the chicken in the center of every roll reaches 165°F / 74°C on a food thermometer. Divide all rolls and sauce among servings. Timings depend on roll size; the temperature check controls doneness.",
    ], "dinner", "cabbage-rolls", ["Oven","Stovetop"]),
  recipe("cod-parcels", "Cod parcels with carrots and zucchini", "Oven-steamed cod and thin-cut vegetables with lemon and parsley.", 30, "Oven",
    [p("cod",170),p("carrot",120),p("zucchini",180),p("lemon",.25),p("parsley",3),p("olive-oil",7),p("salt",.5),p("water",30)], [
      "Heat oven to 400°F / 200°C. Slice carrot very thinly and zucchini into thin half-moons. Place on a large sheet of food-grade baking parchment in a baking dish.",
      "Place cod over vegetables; add the listed oil, lemon, parsley, salt and water. Fold parchment into a closed parcel and bake about 20 minutes.",
      "Open carefully away from the face to release steam. Check fish reaches 145°F / 63°C on a food thermometer and vegetables are tender; cook longer if needed. Divide among servings without adding a sauce.",
    ], "dinner", "fish-parcels"),
  recipe("salmon-potato-cakes", "Salmon and potato cakes with cucumber", "Pan-cooked salmon-potato cakes and a lemon cucumber side.", 45, "Stovetop",
    [p("salmon",150),p("potato",180),p("cucumber",100),p("lemon",.25),p("parsley",3),p("olive-oil",9),p("salt",.5),p("water",220)], [
      "Dice potatoes and simmer in the listed water until tender. Drain and mash. Separately cook the salmon in a covered skillet with a little of that cooking water until it reaches 145°F / 63°C; remove bones and flake.",
      "Mix salmon, mash, parsley and half the salt. Form small cakes and let stand for 5 minutes; these have no egg binder, so handle gently. Heat olive oil in a nonstick skillet and cook cakes on each side until golden and steaming throughout.",
      "Slice cucumber and toss with lemon and remaining salt. Divide cakes and cucumber among servings; no mayonnaise or unlisted coating is included.",
    ], "dinner", "fish-cakes"),
  recipe("poached-cod", "Poached cod with parsley potatoes", "Gently poached cod with potatoes, green beans and parsley oil.", 35, "Stovetop",
    [p("cod",170),p("potato",180),p("green-beans",140),p("water",350),p("olive-oil",7),p("parsley",4),p("lemon",.25),p("salt",.5)], [
      "Dice potatoes and simmer in the water for 15 minutes. Add trimmed green beans and continue until both are tender; lift vegetables out, keeping the cooking liquid.",
      "Lower cod into the gently simmering liquid, cover and cook until it reaches 145°F / 63°C on a food thermometer. Lift it out carefully.",
      "Combine parsley, lemon, olive oil and salt. Divide fish and vegetables with the parsley oil among servings; no packaged broth is used.",
    ], "dinner", "poached-fish"),
  recipe("chickpea-patties", "Chickpea and carrot patties with tomato salad", "Small pan-cooked chickpea patties with fresh tomato and cucumber.", 35, "Stovetop",
    [p("chickpeas",180),p("carrot",60),p("wheat-flour",25),p("tomato",100),p("cucumber",80),p("lemon",.25),p("olive-oil",9),p("cumin",1),p("salt",.5),p("water",20)], [
      "Mash the plain cooked chickpeas thoroughly with a fork. Finely grate carrot; mix into chickpeas with flour, cumin, half the salt and enough listed water to bind. Rest for 5 minutes and form small thin patties.",
      "Heat most of the oil in a nonstick skillet. Cook patties about 5 minutes per side until firm, browned and steaming in the center; raw flour must not be tasted or left uncooked.",
      "Dice tomato and cucumber and dress with lemon, remaining oil and salt. Divide with the patties. Contains wheat; no tahini or egg binder is used.",
    ], "dinner", "legume-patties"),
  recipe("mushroom-quinoa-pilaf", "Mushroom and green bean quinoa pilaf", "Quinoa cooked with mushrooms, green beans and fresh parsley.", 30, "Stovetop",
    [p("quinoa",80),p("mushroom",180),p("green-beans",130),p("onion",40),p("garlic",3),p("olive-oil",7),p("parsley",3),p("salt",.5),p("water",200)], [
      "Rinse quinoa. Slice mushrooms, chop onion and garlic, and cut green beans into short lengths.",
      "Soften onion and mushrooms in olive oil in a covered saucepan. Add garlic, quinoa, green beans, salt and water. Bring to a simmer, cover and cook about 18 minutes until quinoa is tender.",
      "Let stand covered for 5 minutes, then stir in parsley and divide among servings. No stock cube or packaged rice blend is used.",
    ], "dinner", "grain-pilaf"),
  recipe("lentil-shepherd-pie", "Lentil shepherd's pie", "A lentil, mushroom and carrot filling under olive-oil mashed potatoes.", 60, "Oven",
    [p("lentils",70),p("mushroom",100),p("carrot",80),p("potato",220),p("onion",40),p("tomato",100),p("olive-oil",9),p("salt",.5),p("water",450)], [
      "Heat oven to 400°F / 200°C. Dice potatoes and simmer in part of the water until soft; mash with half the oil and salt, retaining a little cooking water as needed.",
      "Finely chop onion, mushrooms, carrots and tomato. Soften in remaining oil in a saucepan. Add rinsed red lentils and remaining water; cover and simmer about 25 minutes until soft and thick. Add reserved potato water only if needed.",
      "Place filling in an ovenproof dish, spread mash over it and bake about 15 minutes until bubbling. Divide among servings. The topping contains neither butter nor milk.",
    ], "dinner", "shepherd-pie", ["Oven","Stovetop"]),
  recipe("spinach-potato-gnocchi", "Potato gnocchi with spinach and tomato", "Small eggless potato dumplings with a fresh tomato-spinach sauce.", 55, "Stovetop",
    [p("potato",220),p("wheat-flour",65),p("spinach",80),p("water",600),tomatoSauce], [
      "Peel and dice potatoes; simmer in most of the water until tender. Drain, let steam dry for 5 minutes and mash. Mix with most of the flour and half the salt into a soft dough; reserve the rest of the flour for the work surface.",
      "Roll into thin ropes and cut small dumplings. Prepare sauce in a second pan: soften listed onion and garlic in the oil, add tomatoes, oregano, remaining salt and water, and simmer 10 minutes. Stir in spinach.",
      "Simmer gnocchi in plain boiling water in batches until they float, then for about 3 more minutes so the flour cooks through. Drain and divide with sauce. Contains wheat; dough behavior and yield need practical review before pilot use.",
    ], "dinner", "potato-dumplings"),
  recipe("zucchini-lentil-bake", "Layered zucchini and lentil bake", "Thin zucchini layers with a thick red-lentil tomato filling.", 55, "Oven",
    [p("zucchini",240),p("lentils",70),p("water",230),tomatoSauce], [
      "Heat oven to 400°F / 200°C. Slice zucchini thinly lengthwise. In a saucepan soften chopped onion and garlic in the listed oil.",
      "Add chopped tomatoes, rinsed lentils, oregano, salt and water; simmer covered for 20 minutes until lentils are soft. Uncover briefly if needed for a thick filling.",
      "Layer zucchini and filling in an ovenproof dish. Bake about 25 minutes until zucchini is tender and center is bubbling. Divide among servings; there is no pasta, cheese or unlisted topping.",
    ], "dinner", "layered-vegetable-bake", ["Oven","Stovetop"]),
  recipe("cabbage-pancakes", "Savory cabbage pancakes with cucumber", "Thin cabbage and wheat-flour pancakes with a fresh cucumber side.", 35, "Stovetop",
    [p("cabbage",160),p("wheat-flour",75),p("water",100),p("cucumber",100),p("lime",.25),p("olive-oil",9),p("salt",.5)], [
      "Shred cabbage finely. Mix flour, water and half the salt into a batter, then fold in cabbage. Do not taste raw batter.",
      "Heat most of the oil in a nonstick skillet. Spread batter into small thin pancakes; cook about 5 minutes per side until firm, golden and fully cooked through. Work in batches; large households take longer.",
      "Dress cucumber slices with lime, remaining oil and salt. Divide with the pancakes. Contains wheat; no egg, bottled sauce or mayonnaise is included.",
    ], "dinner", "savory-vegetable-pancakes"),
  recipe("tomato-flatbread", "Skillet tomato and basil flatbreads", "Freshly cooked wheat flatbreads topped with tomato, basil and white beans.", 45, "Stovetop",
    [p("wheat-flour",90),p("water",55),p("white-beans",130),p("tomato",150),p("basil",4),p("olive-oil",9),p("salt",.5)], [
      "Mix most of the flour with water, half the oil and half the salt. Reserve remaining flour for rolling. Knead gently and rest covered for 15 minutes; no yeast or baking powder is used.",
      "Divide into thin flatbreads. Cook in a hot skillet for about 3 minutes per side until browned and completely cooked; do not taste raw dough.",
      "Warm plain cooked white beans and chopped tomato with remaining oil and salt in the skillet. Divide over flatbreads and finish with basil. Contains wheat. Do not add cheese or commercial pesto.",
    ], "dinner", "flatbread-dinner"),
  recipe("white-bean-spinach", "White beans and spinach with tomato", "A quick, brothy white bean skillet with spinach and garlic.", 25, "Stovetop",
    [p("white-beans",220),p("spinach",120),p("tomato",160),p("garlic",4),p("olive-oil",7),p("salt",.5),p("water",100)], [
      "Chop tomatoes and garlic. Warm the olive oil in a saucepan and soften garlic gently without burning.",
      "Add tomato, water and salt; simmer 10 minutes. Add the plain cooked white beans and simmer until steaming throughout.",
      "Fold in spinach until wilted and divide among servings. No broth, cream or unlisted finishing ingredient is used.",
    ], "dinner", "white-bean-fricassee"),
  recipe("roast-cauliflower-lentils", "Roasted cauliflower with warm lentils", "Caramelized cauliflower over lemon-parsley lentils.", 45, "Oven",
    [p("cauliflower",220),p("lentils",75),p("water",240),p("onion",40),p("olive-oil",9),p("lemon",.25),p("parsley",4),p("cumin",1),p("salt",.5)], [
      "Heat oven to 425°F / 220°C. Cut cauliflower into florets, toss with half the oil, cumin and salt and roast about 30 minutes until tender.",
      "Soften chopped onion in remaining oil in a saucepan. Add rinsed red lentils and water; simmer covered about 20 minutes until soft, stirring to prevent sticking.",
      "Divide lentils and cauliflower among servings; finish with lemon and parsley. No tahini or unlisted dressing is used.",
    ], "dinner", "roasted-legume-vegetable-plate", ["Oven","Stovetop"]),
  recipe("polenta-mushrooms", "Soft polenta with mushroom ragout", "Cornmeal polenta with mushrooms and fresh tomato.", 40, "Stovetop",
    [p("cornmeal",70),p("water",360),p("mushroom",170),p("tomato",120),p("onion",40),p("olive-oil",7),p("salt",.5),p("parsley",3)], [
      "Bring most of the water and half the salt to a simmer. Slowly whisk in plain yellow cornmeal. Cook gently, stirring often, for about 30 minutes or until tender; add remaining listed water as needed.",
      "In a skillet soften chopped onion and mushrooms in olive oil. Add chopped tomato and remaining salt and simmer for 10 minutes.",
      "Divide polenta and mushroom ragout among servings; finish with parsley. No butter, milk, cheese or instant flavored polenta is used.",
    ], "dinner", "polenta-ragout"),
  recipe("chicken-lemon-soup", "Chicken, rice and lemon soup", "A clear homemade chicken soup with carrots, rice and lemon.", 45, "Stovetop",
    [p("chicken",160),p("rice",55),p("carrot",100),p("onion",40),p("water",550),p("olive-oil",5),p("lemon",.25),p("parsley",3),p("salt",.5)], [
      "Dice onion and carrots; soften in olive oil in a saucepan. Cut raw chicken separately into small pieces.",
      "Add chicken, rice, water and salt. Bring to a simmer and cook covered about 25 minutes until rice is tender and chicken reaches 165°F / 74°C on a food thermometer.",
      "Add lemon and parsley and divide among servings. This clear soup uses no egg thickener or packaged broth.",
    ], "dinner", "chicken-soup"),
  recipe("turkey-burger-wedges", "Turkey patties with potato wedges and tomato", "Simple bunless turkey patties with roasted wedges and sliced tomato.", 45, "Oven",
    [p("turkey",170),p("potato",220),p("tomato",130),p("olive-oil",8),p("paprika",1),p("salt",.5)], [
      "Heat oven to 425°F / 220°C. Cut potatoes into wedges, coat with oil, paprika and half the salt, and roast 15 minutes.",
      "With separate raw-meat utensils shape turkey and remaining salt into thin patties. Put on a separate baking tray and bake alongside potatoes until each patty reaches 165°F / 74°C on a food thermometer and wedges are tender.",
      "Slice tomatoes using a clean surface. Divide patties, wedges and tomato among servings. No bun, egg binder or condiment is included.",
    ], "dinner", "burger-patty-dinner"),
  recipe("pork-carrot-braise", "Pork and carrot braise with potatoes", "Small pork pieces gently braised with carrots, potatoes and tomato.", 55, "Stovetop",
    [p("pork",170),p("carrot",130),p("potato",180),p("tomato",120),p("onion",40),p("olive-oil",7),p("water",200),p("salt",.5)], [
      "Cut pork into small pieces on a raw-meat surface. Dice vegetables separately. Warm oil in a covered saucepan and brown pork and onion.",
      "Add carrots, potatoes, tomato, water and salt. Cover and simmer about 35 minutes, stirring occasionally, until vegetables are tender and pork reaches at least 145°F / 63°C on a food thermometer.",
      "Rest off heat covered for at least 3 minutes, then divide among servings. Tenderness and total time require cooking review; no stock cube is used.",
    ], "dinner", "pork-braise"),
  recipe("beef-cabbage-cups", "Beef and rice cabbage cups", "Crisp cabbage cups filled with cumin beef, rice and tomato.", 35, "Stovetop",
    [p("beef",150),p("cabbage",160),p("rice",55),p("water",130),p("tomato",100),p("cilantro",3),p("lime",.25),p("olive-oil",5),p("cumin",1),p("salt",.5)], [
      "Cook rice in the water in a covered saucepan until tender. Separate and wash crisp cabbage leaves; dice tomato with clean utensils.",
      "Heat oil in a skillet and cook the ground beef with cumin and salt, breaking it up, until a food thermometer reads 160°F / 71°C.",
      "Divide rice and beef into cabbage leaves and top with tomato, cilantro and lime. Use clean serving utensils; no bottled dressing is included.",
    ], "dinner", "filled-leaf-cups"),
  recipe("potato-omelet", "Potato and onion omelet", "A thick, fully cooked potato-and-egg omelet with fresh tomatoes.", 40, "Stovetop",
    [p("egg",2),p("potato",200),p("onion",60),p("tomato",120),p("olive-oil",9),p("salt",.5),p("water",60)], [
      "Slice potatoes and onion thinly. Heat oil in a nonstick lidded skillet; add potatoes, onion and water and cook covered about 18 minutes until soft.",
      "Beat eggs and salt in a clean bowl and pour over the vegetables. Cover and cook over low heat until set; the center must reach 160°F / 71°C on a food thermometer.",
      "Cut into wedges and divide with sliced tomato among servings. Contains eggs. No milk or cheese is used; large batches need more time and pans.",
    ], "dinner", "potato-egg-skillet"),
  recipe("bean-oat-loaf", "Black bean and oat loaf with carrots", "A sliceable bean-oat bake served with roasted carrots.", 55, "Oven",
    [p("black-beans",200),p("oats",45),p("onion",40),p("carrot",150),p("tomato",100),p("olive-oil",8),p("paprika",1),p("salt",.5),p("water",30)], [
      "Heat oven to 375°F / 190°C. Mash plain cooked black beans thoroughly. Finely chop onion and tomato; mix with beans, oats, paprika, half the salt, half the oil and water. Stand 10 minutes.",
      "Press into a shallow small loaf dish; thickness affects cooking time. Cut carrots into thin sticks and toss with remaining oil and salt on a separate tray. Bake both about 35 minutes until loaf is firm and steaming and carrots are tender.",
      "Let loaf stand 5 minutes before slicing. Divide with carrots among servings. Binder strength and yield require practical review; do not add an egg or unlisted sauce.",
    ], "dinner", "legume-loaf"),
  recipe("cinnamon-rice-pudding", "Cinnamon rice pudding", "Soft rice cooked slowly in water with a light cinnamon sweetness.", 40, "Stovetop",
    [p("rice",45),p("water",300),p("sugar",12),p("cinnamon",.5)], [
      "Rinse rice and put in a saucepan with the water. Bring to a simmer.",
      "Cook uncovered gently for about 30 minutes, stirring often, until rice is very soft; stir in sugar and cinnamon for the last 5 minutes. This is a water-based rice pudding, not a milk substitute product.",
      "Divide among servings and serve warm. No unlisted topping is included.",
    ], "dessert", "rice-pudding"),
  recipe("lemon-shortbread", "Lemon olive-oil biscuits", "Small crisp wheat biscuits with lemon zest and olive oil.", 35, "Oven",
    [p("wheat-flour",45),p("olive-oil",16),p("sugar",14),p("lemon",.125),p("water",5),p("salt",.1)], [
      "Heat oven to 350°F / 175°C. Wash lemon; use its zest and a little juice. Mix with olive oil, sugar, water and salt, then stir in flour. No leavening is used.",
      "Press into small thin biscuits on a lined tray and bake 15–20 minutes until dry and lightly golden. Do not taste raw dough; the flour must be fully cooked.",
      "Cool on the tray for 10 minutes before dividing among servings. Contains wheat; texture and yield require cooking review.",
    ], "dessert", "short-biscuits"),
  recipe("apple-pancakes", "Apple and oat pancakes", "Small wheat-and-oat pancakes with grated apple.", 30, "Stovetop",
    [p("apple",80),p("wheat-flour",35),p("oats",20),p("water",85),p("sugar",8),p("olive-oil",6),p("cinnamon",.5)], [
      "Grate apple. Mix flour, oats, sugar, cinnamon and water, then fold in apple. Rest 5 minutes; no egg, milk or leavening is included.",
      "Heat olive oil in a nonstick skillet. Make small thin pancakes and cook about 4 minutes per side until set and cooked through; do not taste raw batter.",
      "Divide among servings and serve warm. Contains wheat. Pan capacity affects total time for larger households.",
    ], "dessert", "sweet-pancakes"),
  recipe("banana-oat-cookies", "Banana oat cookies", "Soft, simple banana-and-oat cookies with cinnamon.", 35, "Oven",
    [p("banana",90),p("oats",45),p("olive-oil",5),p("cinnamon",.5)], [
      "Heat oven to 350°F / 175°C. Mash banana and mix with oats, oil and cinnamon; stand for 5 minutes.",
      "Shape small, thin cookies on a lined tray. Bake 20 minutes until firm and lightly browned.",
      "Cool 5 minutes before dividing among servings. These are soft oat cookies; no chocolate chips or other additions are included.",
    ], "dessert", "soft-oat-cookies"),
  recipe("sweet-potato-cocoa-squares", "Sweet potato cocoa squares", "Dense cocoa-wheat squares made with cooked sweet potato.", 70, "Oven",
    [p("sweet-potato",120),p("wheat-flour",35),p("cocoa",8),p("sugar",18),p("olive-oil",12),p("water",140)], [
      "Heat oven to 350°F / 175°C. Peel and dice sweet potato; simmer in most of the water until very soft, drain and mash.",
      "Mix mash with sugar, olive oil, cocoa and remaining water. Fold in flour and spread thinly in a lined small baking dish. Do not taste raw batter.",
      "Bake about 30 minutes until firm and cooked through, then cool 15 minutes before cutting and dividing. Contains wheat. This dense, unleavened candidate needs texture and yield review.",
    ], "dessert", "cocoa-squares", ["Oven","Stovetop"]),
  recipe("apple-galette", "Rustic apple galette", "A folded olive-oil wheat crust around sliced apples.", 60, "Oven",
    [p("wheat-flour",60),p("olive-oil",18),p("water",25),p("apple",140),p("sugar",14),p("cinnamon",.5),p("salt",.1)], [
      "Heat oven to 375°F / 190°C. Mix most of the flour with oil, water and salt; reserve some flour for rolling. Rest 10 minutes. Do not taste raw dough.",
      "Roll thinly on lined baking parchment. Top with thinly sliced apple, sugar and cinnamon, leaving an edge; fold the edge inward.",
      "Bake about 35 minutes until crust is golden and cooked through and apples are tender. Cool 10 minutes and divide among servings. Contains wheat; no butter or egg wash is used.",
    ], "dessert", "fruit-galette"),
  recipe("blueberry-dumplings", "Blueberry sauce with small wheat dumplings", "Small plain dumplings simmered in a blueberry syrup.", 35, "Stovetop",
    [p("berries",140),p("wheat-flour",45),p("water",180),p("sugar",14)], [
      "Mix flour with just enough of the listed water to make a soft dough; roll into very small thin dumplings. Do not taste raw dough.",
      "Simmer blueberries, sugar and remaining water in a wide covered saucepan for 5 minutes. Add the dumplings in a single layer and simmer covered about 15 minutes, turning gently.",
      "Cut a dumpling to check there is no raw dough; continue cooking if needed. Divide dumplings and sauce among servings. Contains wheat; dumpling size and cooking time need practical review.",
    ], "dessert", "sweet-dumplings"),
  recipe("cocoa-oat-pudding", "Rustic cocoa oat pudding", "Soft oats cooked slowly with cocoa and sugar.", 25, "Stovetop",
    [p("oats",40),p("water",240),p("cocoa",7),p("sugar",12)], [
      "Whisk cocoa and sugar into water in a saucepan; stir in rolled oats.",
      "Simmer gently for 15–20 minutes, stirring often, until oats are very soft and thickened.",
      "Divide among servings and serve warm. This is a textured oat pudding; no milk, cream or chocolate drink mix is included.",
    ], "dessert", "oat-pudding"),
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
