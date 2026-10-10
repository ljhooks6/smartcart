import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRecipe, normalizeProgress, normalizeSavedRecipes, rememberRecipe, recipeStorageKey, toggleProgressIndex } from "../lib/recipe-progress.ts";
import { getRecipeSourceKey } from "../lib/recipe-ingredients.ts";

const recipe={title:"Soup",prep_time_minutes:20,ingredients:["Water","Beans"],steps:["Heat","Simmer"]};

test("damaged checkoff storage cannot create duplicate or out-of-range completion",()=>{
  assert.deepEqual(normalizeProgress({ingredients:[0,0,-1,8,"1"],steps:[1,1,99,0.5]},recipe),{ingredients:[0],steps:[1]});
  assert.deepEqual(normalizeProgress(null,recipe),{ingredients:[],steps:[]});
  assert.deepEqual(toggleProgressIndex([0],0),[]);
});

test("incomplete recipes and malformed cache entries are ignored",()=>{
  assert.equal(normalizeRecipe({...recipe,steps:[]}),null);
  assert.equal(normalizeRecipe({...recipe,ingredients:[null]}),null);
  assert.equal(normalizeRecipe({...recipe,prep_time_minutes:NaN}),null);
  assert.deepEqual(normalizeSavedRecipes([null,{}, {source:"x",recipe:{...recipe,steps:[]}}]),[]);
});

test("recipe and checkoffs survive JSON reload with account-scoped bounded storage",()=>{
  const record={source:"source",recipe,progress:{ingredients:[0],steps:[1]}};
  assert.deepEqual(normalizeSavedRecipes(JSON.parse(JSON.stringify([record]))),[record]);
  assert.notEqual(recipeStorageKey("one"),recipeStorageKey("two"));
  assert.notEqual(recipeStorageKey("one"),recipeStorageKey(""));
  const records=Array.from({length:20},(_,i)=>({...record,source:String(i)}));
  const updated=rememberRecipe(records,record);
  assert.equal(updated.length,20);
  assert.equal(updated[0].source,"1");
  assert.equal(rememberRecipe(updated,{...record,progress:{ingredients:[],steps:[]}}).filter(item=>item.source==="source").length,1);
});

test("changed servings or ingredients cannot reuse old recipe progress",()=>{
  const meal={name:"Soup",servings:2,notes:"Simmer",ingredients:[{name:"Beans",amount:"1 can"}]};
  const source=getRecipeSourceKey(meal);
  assert.notEqual(source,getRecipeSourceKey({...meal,servings:4}));
  assert.notEqual(source,getRecipeSourceKey({...meal,ingredients:[{name:"Beans",amount:"2 cans"}]}));
});
