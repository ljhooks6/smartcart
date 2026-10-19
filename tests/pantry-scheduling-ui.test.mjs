import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
function load(file){const module={exports:{}};const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',source)(name=>{if(name.startsWith('.')||name.startsWith('@/')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);return load(/\.tsx?$/.test(base)?base:existsSync(base+'.tsx')?base+'.tsx':base+'.ts');}return require(name);},module,module.exports);return module.exports;}
const noop=()=>{};

test('both Plan surfaces use the same searchable editor and leave breakfast/lunch disabled for every tier',()=>{
 const {SmartCartContextForm}=load(path.resolve('components/smart-cart-context-form.tsx'));
 for(const userPlan of ['guest','free','plus']){
  const props=new Proxy({userPlan,pantryEntries:[],combinedPantryItems:[],fullyStocked:new Set(),adventureLevelOptions:[],equipmentOptions:[],prepTimeOptions:[],pantryCategoryStyles:{},pantryQuickSelectOptions:{Staples:['Rice']},isPantryOpen:true,isPantrySelectionOpen:true,formState:{budget:'60',householdSize:'2',diet:'No preference',cuisinePreference:'',mealSourceMode:'pantry-and-store',pantryItems:'',mustHaveIngredient:'',avoidIngredients:'',includeDessert:false,includeBreakfast:true,includeLunch:true,prepTime:'',adventureLevel:'',availableEquipment:['Stovetop']}},{get:(o,k)=>typeof k==='string'&&k.startsWith('on')?noop:o[k]});
  const html=renderToStaticMarkup(React.createElement(SmartCartContextForm,props));
  assert.equal((html.match(/Search pantry ingredients/g)||[]).length,2);assert.doesNotMatch(html,/Pantry Check/);
  assert.equal((html.match(/type="checkbox" disabled=""/g)||[]).length,2);assert.doesNotMatch(html,/type="checkbox" disabled=""[^>]*checked/);
  assert.match(html,/planned for a future update/);assert.match(html,/legal\/safety/);
 }
});

test('pantry controls identify ingredient, unknown amount, quantity, unit and sufficiency without hiding limitations',()=>{
 const {SmartCartPantryEditor}=load(path.resolve('components/smart-cart-pantry-editor.tsx'));
 const html=renderToStaticMarkup(React.createElement(SmartCartPantryEditor,{entries:[{name:'Rice',status:'owned'}],options:{Staples:['Rice']},onChange:noop,requirements:[{item_key:'rice',needed_amount:'2 cups',requirement_key:'current'}]}));
 assert.match(html,/Amount unknown/);assert.match(html,/Quantity \(optional\)/);assert.match(html,/cup \(US\)/);assert.match(html,/I have enough for this week/);assert.match(html,/Remove Rice from pantry/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});

test('day controls expose occupancy and the explicit swap, including a way to remove assignments',()=>{
 const meal={day:'Day 1',name:'Soup',scheduledDay:'Monday'},other={day:'Day 2',name:'Roast',scheduledDay:'Tuesday'};
 const {SmartCartDayPicker}=load(path.resolve('components/smart-cart-day-picker.tsx'));
 const html=renderToStaticMarkup(React.createElement(SmartCartDayPicker,{value:'Monday',meal,meals:[meal,other],onChange:noop}));
 assert.equal((html.match(/<option/g)||[]).length,8);assert.match(html,/<option value="Tuesday" disabled="">Tuesday — Roast/);assert.match(html,/Sunday — Available/);
 const {SmartCartScheduleDialog}=load(path.resolve('components/smart-cart-schedule-dialog.tsx'));
 const dialog=renderToStaticMarkup(React.createElement(SmartCartScheduleDialog,{meal,meals:[meal,other],editing:true,onClose:noop,onAdd:noop}));
 assert.equal((dialog.match(/type="radio"/g)||[]).length,8);assert.match(dialog,/Occupied — Roast/);assert.match(dialog,/Flexible — no day assigned/);assert.match(dialog,/not recipes or AI allowance/);
});

test('Shop renders shortages and incomplete prices without claiming a zero-cost budget',()=>{
 const {SmartCartGrocerySidebar}=load(path.resolve('components/smart-cart-grocery-sidebar.tsx'));
 const props=new Proxy({displayGroceriesByCategory:[['Produce',[{category:'Produce',name:'Carrot',item_key:'carrot',estimated_price:0,price_status:'unavailable',needed_amount:'3',shortage_amount:'1',pantry_note:'Pantry: 2 each available.',meal_names:['Soup','Roast']}]]],skippedGroceriesByCategory:[],restoredItems:[],checkedItems:new Set(),customItems:[],isGroceryOpen:true,hasUnknownPrices:true,totalCost:0,parsedBudget:60,budgetPercentage:0,rawBudgetPercentage:0,budgetStatusLabel:'Budget check pending',budgetStatusTextClass:'text-ink/65',budgetProgressBarClass:'bg-stone-400',formatCurrency:n=>`$${n.toFixed(2)}`,newCustomItem:''},{get:(o,k)=>typeof k==='string'&&k.startsWith('on')?noop:o[k]});
 const html=renderToStaticMarkup(React.createElement(SmartCartGrocerySidebar,props));
 assert.match(html,/Recipes use 3/);assert.match(html,/Still need 1/);assert.match(html,/Pantry: 2 each available/);assert.match(html,/Estimate unavailable/);assert.doesNotMatch(html,/\$0\.00/);assert.match(html,/incomplete estimate cannot verify your budget/);
 for(const label of html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g))assert.doesNotMatch(label[1],/<button/);
});
