import assert from 'node:assert/strict';
import test from 'node:test';
import {deriveGroceryLists,aggregateIngredientItems,getIngredientKey} from '../lib/grocery-list.ts';
import {normalizePantry,pantryStorageKey,readOwnedPantry,addPantryEntry,searchPantry,pantryNames,pantryCloudPayload} from '../lib/pantry.ts';
import {convertQuantity,parseIngredient} from '../lib/ingredient-quantity.ts';
import {bindNewMealOwner,mealsForOwner,assignCookingDay,dinnerDayOccupancy,setCookingDay} from '../lib/meal-schedule.ts';
import {emptyShoppingState,shoppingReducer,parseShoppingProgress} from '../lib/shopping-progress.ts';
import {optionalMealPauseResponse} from '../lib/meal-availability.ts';
import {replacementIngredientItems} from '../lib/recipe-ingredients.ts';
const meal=(name,ingredients,extra={})=>({name,day:name,user_id:'synthetic-owner',ingredients:ingredients.map(([name,amount])=>({name,amount})),...extra});
const derive=(extra={})=>deriveGroceryLists({fullyStocked:new Set(),runningLow:new Set(),restock:new Set(),weeklyMenu:[],savedDesserts:[],...extra});
const item=(result,name)=>[...result.derivedGroceryList,...result.skippedGroceryList].find(i=>i.item_key===getIngredientKey(name));
const week=[meal('Soup',[['Carrots','2'],['Rice','1 cup'],['Garlic powder','1/2 tsp']]),meal('Roast',[['1 carrot, grated','1 carrot'],['Rice','1/2 cup'],['Garlic powder','1/4 tsp']])];

test('replacement ingredient lines retain actual amounts rather than invented packs or prices',()=>{
 const replacement={...week[0],name:'Skillet',ingredients:replacementIngredientItems(['3 carrots','1/2 cup rice','1/4 tsp garlic powder','1 can chickpeas','salt to taste'])};
 const r=derive({weeklyMenu:[replacement,week[1]],savedDesserts:[meal('Pudding',[['Rice','1/2 cup']])],pantryEntries:normalizePantry([{name:'Carrot',quantity:2,unit:'each'},{name:'Rice',quantity:1,unit:'cup'}])});
 assert.equal(item(r,'Carrot').needed_amount,'4');assert.equal(item(r,'Carrot').shortage_amount,'2');
 assert.equal(item(r,'Rice').needed_amount,'1.5 cups');assert.equal(item(r,'Rice').shortage_amount,'0.5 cups');
 assert.equal(item(r,'Garlic powder').needed_amount,'0.5 tsp');
 assert.equal(item(r,'Salt').needed_amount,'to taste');
 assert.ok([...r.derivedGroceryList,...r.skippedGroceryList].every(i=>i.estimated_price===0&&!i.review_required));
 assert.deepEqual(replacementIngredientItems(['mystery sauce']),[{name:'mystery sauce',amount:'',price:0}]);
});

test('aggregate all dinners and desserts before subtracting each pantry amount once',()=>{
 const result=derive({weeklyMenu:week,savedDesserts:[meal('Pudding',[['Rice','1/2 cup']])],pantryEntries:normalizePantry([{name:'Carrot',quantity:2,unit:'each'},{name:'Rice',quantity:1,unit:'cup'}])});
 assert.equal(item(result,'Carrots').needed_amount,'3');assert.equal(item(result,'Carrots').shortage_amount,'1');
 assert.equal(item(result,'Rice').needed_amount,'2 cups');assert.equal(item(result,'Rice').shortage_amount,'1 cup');
 assert.equal(item(result,'Garlic powder').needed_amount,'0.75 tsp');
 assert.deepEqual(item(result,'Rice').meal_names,['Pudding','Roast','Soup']);
 assert.equal(result.derivedGroceryList.length,3);
 assert.deepEqual(result,derive({weeklyMenu:week,savedDesserts:[meal('Pudding',[['Rice','1/2 cup']])],pantryEntries:normalizePantry([{name:'Carrot',quantity:2,unit:'each'},{name:'Rice',quantity:1,unit:'cup'}])}));
});

test('name-only pantry and stock labels never mean unlimited inventory',()=>{
 for(const status of ['owned','stocked','low','restock']){
  const r=derive({weeklyMenu:week,pantryEntries:normalizePantry([{name:'Rice',status}])});assert.match(item(r,'Rice').pantry_note,/Amount unknown/);assert.equal(item(r,'Rice').shortage_amount,'1.5 cups');assert.equal(r.skippedGroceryList.length,0);
 }
 const legacy=normalizePantry(['Rice','My custom spice']);assert.equal(legacy.length,2);assert.equal(legacy[1].name,'My custom spice');assert.equal(legacy[0].quantity,undefined);
 assert.equal(normalizePantry(['香菜','Jalapeño'])[0].name,'香菜');assert.equal(getIngredientKey('Jalapeño'),getIngredientKey('Jalapeno'));
 assert.deepEqual(pantryNames(normalizePantry([{name:'Rice',quantity:0} ])),[]);
});

test('sufficiency confirmation applies only to this exact selected requirement',()=>{
 const gross=derive({weeklyMenu:week}).pantryRequirements.find(i=>i.item_key==='rice');
 const entries=normalizePantry([{name:'Rice',confirmedFor:gross.requirement_key}]);
 assert.equal(derive({weeklyMenu:week,pantryEntries:entries}).skippedGroceryList.length,1);
 assert.equal(derive({weeklyMenu:[...week,meal('Extra',[['Rice','1 cup']])],pantryEntries:entries}).skippedGroceryList.length,0);
 assert.equal(derive({weeklyMenu:[week[0]],pantryEntries:entries}).skippedGroceryList.length,0);
 assert.equal(derive({weeklyMenu:[{...week[0],scheduledDay:'Tuesday'},week[1]],pantryEntries:entries}).skippedGroceryList.length,1,'rescheduling changes no food quantity');
 assert.equal('confirmedFor' in pantryCloudPayload(entries)[0],false,'selection confirmation is not permanent inventory');
});

test('compatible conversions work; density, size, packages and conflicting measurements need review',()=>{
 assert.equal(convertQuantity({value:8,unit:'oz'},'lb'),0.5);
 for(const [from,to] of [['cup','g'],['each','oz'],['bottle','tbsp'],['bottle','bottle'],['large carrot','each']])assert.equal(convertQuantity({value:1,unit:from},to),null);
 for(const unit of ['g','bottle','large carrot']){const r=derive({weeklyMenu:week,pantryEntries:normalizePantry([{name:'Rice',quantity:100,unit}])});assert.equal(r.skippedGroceryList.length,0);assert.match(item(r,'Rice').pantry_note,/cannot be compared/);}
 const bad=derive({weeklyMenu:[meal('Conflict',[['1 carrot, grated','3 carrots']])],pantryEntries:normalizePantry([{name:'Carrot',quantity:20,unit:'each'}])});assert.equal(item(bad,'Carrot').review_required,true);assert.equal(bad.skippedGroceryList.length,0);
});

test('prep is not a product name; qualitative salt/pepper split without package inventions',()=>{
 const r=derive({weeklyMenu:[meal('Tacos',[['1 lime, juiced',''],['1 carrot, grated',''],['Salt and black pepper to taste','']])]});
 assert.deepEqual(r.derivedGroceryList.map(i=>i.name),['Black pepper','carrot','lime','Salt']);
 assert.equal(item(r,'Lime').needed_amount,'1');assert.deepEqual(item(r,'Lime').preparation_notes,['juiced']);
 assert.equal(item(r,'Salt').needed_amount,'to taste');
 for(const i of r.derivedGroceryList){assert.equal(i.estimated_price,0);assert.equal(i.price_status,'unavailable');assert.equal(i.buy_amount,undefined);}
 const composite=parseIngredient('Salt and black pepper','1 tsp')[0];assert.equal(composite.reviewRequired,true);
 assert.equal(parseIngredient('Sauce or dressing','1 tbsp')[0].reviewRequired,true);
 assert.equal(getIngredientKey('Garlic'),getIngredientKey('Garlic cloves, minced'));
 assert.notEqual(getIngredientKey('Garlic'),getIngredientKey('Garlic powder'));
 assert.notEqual(getIngredientKey('Fresh basil'),getIngredientKey('Dried basil'));
 assert.notEqual(getIngredientKey('Soy sauce'),getIngredientKey('Gluten-free soy sauce'));
});

test('restock status remains separate from measured stock and does not duplicate ingredient rows',()=>{
 const r=derive({weeklyMenu:week,pantryEntries:normalizePantry([{name:'Rice',status:'restock',quantity:2,unit:'cup'},{name:'Olive oil',status:'restock'}])});
 assert.equal(r.skippedGroceryList.find(i=>i.item_key==='rice').shortage_amount,'0');
 assert.equal(r.derivedGroceryList.filter(i=>i.name==='Rice').length,0);assert.equal(r.derivedGroceryList.filter(i=>i.name==='Olive oil').length,1);
});

test('search resolves aliases, deduplicates custom names and preserves owner isolation',()=>{
 let entries=normalizePantry(['My custom spice','Scallions']);assert.equal(addPantryEntry(entries,'Green onions'),entries);
 assert.deepEqual(searchPantry(['Green onions','Rice'],entries,'scallion'),['Scallions']);
 entries=addPantryEntry(entries,'Blue cornmeal');assert.equal(entries.length,3);
 const record={owner:'alice',entries};assert.deepEqual(readOwnedPantry(record,'bob'),[]);assert.deepEqual(readOwnedPantry(record,'alice'),entries);
 assert.notEqual(pantryStorageKey('alice'),pantryStorageKey('bob'));assert.notEqual(pantryStorageKey('alice'),pantryStorageKey('guest'));
});

test('changed needs clear stale checks/removals while preserving unchanged items and manual extras',()=>{
 let s=shoppingReducer(emptyShoppingState(),{type:'reconcile',requirements:{rice:'1cup',carrot:'2'}});
 s=shoppingReducer(s,{type:'check',key:'rice',name:'Rice'});s=shoppingReducer(s,{type:'check',key:'carrot',name:'Carrot'});
 s=shoppingReducer(s,{type:'remove',key:'rice',name:'Rice'});s=shoppingReducer(s,{type:'custom-add',item:{id:'manual',name:'Paper towels',isChecked:true}});
 s=shoppingReducer(s,{type:'reconcile',requirements:{rice:'2cups',carrot:'2'}});
 assert.deepEqual(s.checked,['carrot']);assert.deepEqual(s.removed,[]);assert.equal(s.custom[0].isChecked,true);
 assert.deepEqual(parseShoppingProgress(JSON.parse(JSON.stringify(s))).fingerprints,s.fingerprints);
});

test('seven visible dinner days prevent duplicates; moves, swaps and removal preserve recipe data',()=>{
 const a=meal('Soup',[['Carrot','2']],{scheduledDay:'Monday'}),b=meal('Roast',[['Rice','1 cup']],{scheduledDay:'Tuesday'});
 const source=[a,b];assert.equal(dinnerDayOccupancy(source).length,7);assert.equal(dinnerDayOccupancy(source)[1].meals[0].name,'Roast');
 assert.equal(assignCookingDay(source,a,'Tuesday').ok,false);
 const swapped=assignCookingDay(source,a,'Tuesday','swap');assert.equal(swapped.ok,true);assert.deepEqual(swapped.meals.map(m=>m.scheduledDay),['Tuesday','Monday']);
 assert.deepEqual(swapped.meals.map(m=>m.ingredients),source.map(m=>m.ingredients));assert.deepEqual(source,[a,b]);
 const moved=assignCookingDay(swapped.meals,swapped.meals[0],'Sunday');assert.equal(moved.ok,true);assert.equal(moved.meals[0].scheduledDay,'Sunday');
 const removed=assignCookingDay(moved.meals,moved.meals[0],undefined);assert.equal(removed.meals[0].scheduledDay,undefined);
 assert.deepEqual(JSON.parse(JSON.stringify(swapped.meals)).map(m=>m.scheduledDay),['Tuesday','Monday']);
 assert.deepEqual(derive({weeklyMenu:source}),derive({weeklyMenu:swapped.meals}),'schedule must not alter grocery requirements');
});

test('explicit new-meal swaps and legacy overlaps never discard an existing dinner',()=>{
 const a=meal('Soup',[],{scheduledDay:'Monday'}),b=meal('Roast',[],{scheduledDay:'Monday'}),c=meal('New',[]);
 assert.equal(assignCookingDay([a,b],c,'Monday','swap').ok,false);assert.equal(dinnerDayOccupancy([a,b])[0].meals.length,2);
 const r=assignCookingDay([a],c,'Monday','swap');assert.equal(r.ok,true);assert.equal(r.meals.length,2);assert.equal(r.meals[0].scheduledDay,undefined);assert.equal(r.meals[1].scheduledDay,'Monday');
 const historical=meal('Saved toast',[],{day:'Breakfast 1'});assert.equal(assignCookingDay([a],historical,'Monday').ok,true);
 assert.deepEqual(setCookingDay(a,'not a day').scheduledDay,undefined);
});

test('breakfast/lunch pause applies to any caller and leaves ordinary/historical input untouched',async()=>{
 for(const identity of ['guest','free','plus','administrator'])for(const request of [{includeBreakfast:true},{includeLunch:true},{mealType:'Breakfast'},{mealType:'lunch'}]){
  const r=optionalMealPauseResponse({...request,plan:identity});assert.equal(r.status,422);assert.equal((await r.json()).code,'MEAL_TYPE_PAUSED');
 }
 assert.equal(optionalMealPauseResponse({includeBreakfast:false,includeLunch:false}),null);
 assert.equal(optionalMealPauseResponse({mealType:'dinner'}),null);
 const historical={meals:[{day:'Breakfast 1',name:'Toast'}]};assert.equal(optionalMealPauseResponse(historical),null);assert.equal(historical.meals[0].name,'Toast');
});

test('rendered schedules and grocery inputs never include another account or guest namespace',()=>{
 const owned=[meal('Alice dinner',[['Rice','1 cup']],{user_id:'alice'}),meal('Bob dinner',[['Carrot','2']],{user_id:'bob'}),meal('Guest dinner',[['Salt','to taste']],{user_id:''})];
 for(const owner of ['alice','bob','']){const selected=mealsForOwner(owned,owner);assert.equal(selected.length,1);assert.equal(selected[0].user_id,owner);assert.equal(derive({weeklyMenu:selected}).derivedGroceryList.length,1);}
 assert.deepEqual(mealsForOwner(owned,'new-account'),[]);assert.equal(owned.length,3);
 const generated={day:'Day 1',name:'New meal'};const bound=bindNewMealOwner(generated,'alice');assert.equal(mealsForOwner([bound],'alice').length,1);assert.equal(bindNewMealOwner(owned[1],'alice'),null);assert.equal(generated.user_id,undefined);
});
