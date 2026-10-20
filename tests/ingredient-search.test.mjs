import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {INGREDIENT_CATALOG,PANTRY_INGREDIENT_OPTIONS} from '../lib/ingredient-catalog.ts';
import {ingredientKey} from '../lib/ingredient-quantity.ts';
import {pantryPickerMatches} from '../lib/pantry-picker.ts';
import {searchPantry,normalizePantry} from '../lib/pantry.ts';
import {catalogSuggestion,isExactIngredientMatch} from '../lib/ingredient-search.ts';

const names=(query,entries=[])=>pantryPickerMatches(entries,PANTRY_INGREDIENT_OPTIONS,query).map(item=>item.name);
test('reported prefixes retrieve practical ingredients ahead of irrelevant owned substrings',()=>{
 const result=names('almo',[{name:'Salmon',status:'owned'}]);
 for(const name of ['Almonds','Almond milk','Almond flour','Almond butter'])assert.ok(result.indexOf(name)>=0&&result.indexOf(name)<result.indexOf('Salmon'));
 assert.ok(names('jell').includes('Jelly'));assert.ok(names('jell').includes('Grape jelly'));assert.ok(names('jell').includes('Strawberry jelly'));
 assert.ok(names('cilan').includes('Cilantro'));
 const ja=names('ja').slice(0,12);assert.ok(ja.includes('Jalapeño'));assert.ok(ja.includes('Jasmine rice'));
 assert.equal(names('jalapeno')[0],'Jalapeño');
 assert.equal(names('jala\u0070en\u0303o')[0],'Jalapeño');
});
test('ranking follows exact, name-prefix, word-prefix, alias, substring regardless of ownership',()=>{
 const options=['Bicarb','Bicarb blend','Example bicarb','Debicarbified example'];
 const result=searchPantry(options,[{name:'Debicarbified example',status:'owned'}],'bicarb');
 const order=['Bicarb','Bicarb blend','Example bicarb','Baking soda','Debicarbified example'];
 for(let i=1;i<order.length;i++)assert.ok(result.indexOf(order[i-1])<result.indexOf(order[i]),`${order[i-1]} before ${order[i]}`);
 assert.equal(names('EVOO')[0],'Extra-virgin olive oil');
 assert.equal(names('AP flour')[0],'All-purpose flour');
 assert.equal(names('TVP')[0],'Textured vegetable protein');
 assert.equal(names('aubergine')[0],'Eggplant');
 assert.ok(names('garbanzo').includes('Chickpeas'));
 assert.equal(names('mayo')[0],'Mayo');
});
test('existing names and explicit catalog aliases open the original entry without duplicate Add candidates',()=>{
 for(const [stored,query,catalog] of [['Jalapeno','jalapeño','Jalapeño'],['Scallions','green onion','Green onions'],['Garbanzo beans','chickpea','Chickpeas'],['Bicarb','baking soda','Baking soda']]){
  const entries=[{name:stored,quantity:2,unit:'each',status:'low'}],before=JSON.stringify(entries);
  const matches=pantryPickerMatches(entries,PANTRY_INGREDIENT_OPTIONS,query);
  assert.equal(matches.find(match=>match.name===stored)?.entry,entries[0]);
  assert.equal(pantryPickerMatches(entries,{},stored)[0].entry,entries[0]);
  assert.ok(!matches.some(match=>match.name===catalog&&!match.entry));
  assert.equal(JSON.stringify(entries),before);
 }
 // Separately stored legacy entries are never silently discarded or renamed.
 const entries=[{name:'Chickpeas',status:'owned'},{name:'Garbanzo beans',status:'low'}];
 assert.equal(pantryPickerMatches(entries,{},'garbanzo').filter(item=>item.entry).length,2);
});
test('custom creation distinguishes incomplete searches from exact names and aliases',()=>{
 for(const query of ['Jalapeno','Almond milk','AP flour','coriander leaves']){
  assert.ok(pantryPickerMatches([],{},query).some(match=>match.exact),query);
 }
 assert.ok(!pantryPickerMatches([],{},'Grandma special spice').some(match=>match.exact));
 assert.ok(!pantryPickerMatches([],{},'almo').some(match=>match.exact));
 assert.equal(isExactIngredientMatch('Almond milk','Almonds'),false);
});
test('search aliases do not conflate food formulations, preparation forms or stored identity',()=>{
 const entries=normalizePantry(['Almonds','Almond milk','Almond flour','Almond butter','Cilantro','Ground coriander','Coriander seeds','Fresh basil','Dried basil','Milk','Lactose-free milk','Oat milk']);
 const before=JSON.stringify(entries);
 assert.equal(entries.length,12);
 assert.equal(catalogSuggestion('coriander leaves').name,'Cilantro');
 assert.equal(catalogSuggestion('Ground coriander').name,'Ground coriander');
 for(const name of entries.map(entry=>entry.name)){
  const result=pantryPickerMatches(entries,{},name);
  assert.equal(result[0].entry?.name,name);
 }
 assert.equal(JSON.stringify(entries),before);
 assert.notEqual(ingredientKey('almonds'),ingredientKey('almond milk'));
 assert.notEqual(ingredientKey('cilantro'),ingredientKey('ground coriander'));
 // Search-only aliases do not rewrite the shared grocery identity function.
 assert.notEqual(ingredientKey('bicarb'),ingredientKey('baking soda'));
 assert.equal(names('😊').length,0);
 assert.ok(names('family secret',[{name:'Family secret sauce',status:'owned'}]).includes('Family secret sauce'));
 assert.ok(!names('family secret',[]).includes('Family secret sauce'));
});
test('bundled catalog is categorized, unique under existing canonical identity and bounded in size',()=>{
 assert.ok(INGREDIENT_CATALOG.length>=600);
 assert.ok(new Set(INGREDIENT_CATALOG.map(item=>item.category)).size>=10);
 const keys=INGREDIENT_CATALOG.map(item=>ingredientKey(item.name));
 assert.equal(new Set(keys).size,keys.length,'duplicate canonical catalog names');
 assert.ok(INGREDIENT_CATALOG.every(item=>item.name.trim()&&item.category&&Array.isArray(item.aliases)));
 const data=readFileSync(new URL('../lib/ingredient-catalog.ts',import.meta.url));
 assert.ok(data.length<64*1024);assert.ok(gzipSync(data).length<12*1024);
 const first=names('ja');for(let i=0;i<5;i++)assert.deepEqual(names('ja'),first);
});
