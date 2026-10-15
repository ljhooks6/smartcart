const pantry='Rice, Chicken breast, Eggs, Milk, Tomatoes, Carrots, Onions, Garlic, Potatoes, Black beans, Olive oil, Salt, Black pepper, Paprika, Cumin, Lemon, Oats, Flour, Sugar, Butter';
const base={budget:100,householdSize:2,diet:'No preference',combinedPantryItems:pantry,availableEquipment:['Oven','Stovetop','Microwave'],adventureLevel:'Mix it up',mealSourceMode:'pantry-and-store',includeDessert:false};
const structured=(allergies)=>'No preference\nMealCaddie dietary settings v1: '+JSON.stringify({allergies,preferences:[],customAllergies:'',intolerances:'',medical:''});
export const cases=[
 ['two-adults-60',{budget:60}],['adventurous-100',{adventureLevel:'Try new cuisines'}],
 ['family-four',{householdSize:4,budget:140,adventureLevel:'Stick to basics'}],
 ['limited-equipment',{availableEquipment:['Stovetop']}],['short-prep',{prepTime:'Under 30 minutes'}],
 ['pantry-only',{mealSourceMode:'pantry-only',combinedPantryItems:pantry}],
 ['vegetarian',{diet:'Vegetarian',combinedPantryItems:pantry.replace('Chicken breast, ','')}],
 ['common-allergen',{diet:structured(['Eggs'])}],['multiple-restrictions',{diet:structured(['Milk','Sesame'])}],
 ['dessert-inclusive',{budget:120,includeDessert:true}],
].map(([id,input])=>({id,input:{...base,...input}}));
export const rubric=['culinary appeal','ingredient/recipe coherence','cuisine/technique variety','practical protein variety','repetition','dessert creativity','budget compliance','cooking feasibility','dietary compliance','description quality'];
