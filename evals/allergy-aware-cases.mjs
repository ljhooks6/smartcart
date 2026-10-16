// Authored, realistic planning scenarios, not model responses or clinical trials.
export const sourceAllergens=['Milk','Eggs','Fish','Crustacean shellfish','Tree nuts','Peanuts','Wheat','Soy','Sesame'];
export const dietary=(allergies=[],extra={})=>'No preference\nMealCaddie dietary settings v1: '+JSON.stringify({allergies,preferences:[],customAllergies:'',intolerances:'',medical:'',...extra});
export const base={diet:dietary(['Milk']),householdSize:2,budget:80,count:7,includeDessert:true,availableEquipment:['Stovetop','Oven'],maxMinutes:45,pantry:[]};
export const pantryForStew=[
  ['Cooked plain chickpeas',360,'g'],['Rice',130,'g'],['Water',520,'ml'],['Tomatoes',360,'g'],['Garlic',8,'g'],
  ['Olive oil',10,'ml'],['Onions',100,'g'],['Oregano',1,'g'],['Salt',1,'g'],
].map(([name,quantity,unit])=>({name,quantity,unit}));
export const planningCases=[
  ...sourceAllergens.map(a=>({id:'single-'+a,input:{...base,diet:dietary([a])},expected:true})),
  {id:'milk-egg-peanut-sesame',input:{...base,diet:dietary(['Milk','Eggs','Peanuts','Sesame'])},expected:true},
  {id:'all-nine-sources',input:{...base,diet:dietary(sourceAllergens)},expected:true},
  {id:'vegan-seven-dinners',input:{...base,diet:dietary(['Milk'],{preferences:['Vegan']})},expected:true},
  {id:'lactose-separated-from-allergy',input:{...base,diet:dietary([],{intolerances:'lactose intolerance'})},expected:true},
  {id:'ingredient-avoidance',input:{...base,avoidIngredients:'no chicken breast, ground beef',count:3},expected:true},
  {id:'pantry-only-exact-quantities',input:{...base,count:1,includeDessert:false,mealSourceMode:'pantry-only',selectedRecipeIds:['chickpea-tomato-stew'],pantry:pantryForStew},expected:true},
  {id:'pantry-conflict-quarantined',input:{...base,count:1,includeDessert:false,mealSourceMode:'pantry-only',selectedRecipeIds:['chickpea-tomato-stew'],pantry:[...pantryForStew,{name:'Milk',quantity:500,unit:'ml'},{name:'Bottled sauce',quantity:100,unit:'g'}]},expected:true},
  {id:'pantry-shortage-not-hidden',input:{...base,count:1,includeDessert:false,mealSourceMode:'pantry-only',selectedRecipeIds:['chickpea-tomato-stew'],pantry:pantryForStew.filter(p=>p.name!=='Rice')},expected:false},
  {id:'unattainable-budget',input:{...base,budget:1},expected:false},
  {id:'unattainable-time',input:{...base,maxMinutes:15},expected:false},
  {id:'custom-kiwi-allergy',input:{...base,diet:dietary([],{customAllergies:'kiwi'})},expected:false},
  {id:'medical-renal-diet',input:{...base,diet:dietary([],{medical:'renal diet'})},expected:false},
  {id:'celiac-gluten-claim',input:{...base,diet:dietary([],{preferences:['Gluten-free']})},expected:false},
  {id:'ambiguous-nut-free',input:{...base,diet:'nut free'},expected:false},
  {id:'legacy-allergy-needs-confirmation',input:{...base,diet:'soy allergy'},expected:false},
];
export const draftCases=[
  {id:'milk-in-recipe',allergies:['Milk'],draft:{title:'Soup',ingredients:[{name:'Milk'}]}},
  {id:'tahini-replacement',allergies:['Sesame'],draft:{title:'Lemon dressing',ingredients:[{name:'Tahini'}]}},
  {id:'peanut-dessert',allergies:['Peanuts'],draft:{desserts:[{title:'Groundnut cookies',ingredients:['Groundnuts']}]}},
  {id:'milk-restock',allergies:['Milk'],draft:{meals:[{name:'Rice',ingredients:['Rice']}],restock_items:[{item:'Milk [RESTOCK]'}]}},
  {id:'soy-tofu',allergies:['Soy'],draft:{ingredients:['Tofu']}},
  {id:'shellfish-prawns',allergies:['Crustacean shellfish'],draft:{ingredients:['Prawns']}},
  {id:'milk-caseinate',allergies:['Milk'],draft:{ingredients:['Sodium caseinate']}},
  {id:'unknown-pesto',allergies:['Milk','Tree nuts'],draft:{ingredients:['Pesto']}},
  {id:'compound-sauce',allergies:['Fish','Wheat','Soy'],draft:{ingredients:['Worcestershire sauce']}},
  {id:'hidden-stock',allergies:['Milk'],draft:{ingredients:['Chicken stock']}},
  {id:'plant-alternative-unknown',allergies:['Milk','Tree nuts'],draft:{ingredients:['Dairy-free almond milk']}},
  {id:'adversarial-id-spoof',allergies:['Milk'],draft:{ingredients:[{name:'Milk',foodId:'rice',allergens:[],verified:true}]}},
  {id:'self-reported-composition',allergies:['Milk'],draft:{ingredients:[{name:'White sauce',components:['Water'],complete:true,safe:true}]}},
  {id:'step-only-substitution',allergies:['Sesame'],draft:{ingredients:['Rice'],steps:['Substitute tahini for the oil.']}},
  {id:'unlisted-step-food',allergies:['Milk'],draft:{ingredients:['Rice'],steps:['Add a packet of the secret finishing powder.']}},
  {id:'unknown-grocery',allergies:['Eggs'],draft:{grocery_list:[{item:'Creamy dressing'}]}},
  {id:'unsupported-assurance',allergies:['Milk'],draft:{description:'Guaranteed safe and allergen-free',ingredients:['Rice']}},
  {id:'incomplete-recipe',allergies:['Milk'],draft:{name:'Chicken dinner',ingredients:[]}},
];
