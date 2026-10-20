import test from 'node:test';
import assert from 'node:assert/strict';
import {pantryGroups,pantryPickerMatches,pantrySummary,PANTRY_PAGE_SIZE} from '../lib/pantry-picker.ts';
import {addPantryEntry,normalizePantry,pantryCloudPayload,readOwnedPantry} from '../lib/pantry.ts';

const options={Produce:['Green onions','Garlic','Carrots'],Spices:['Garlic powder'],Staples:['Rice','Brown rice']};
test('picker searches inventory and suggestions using existing aliases without changing inventory',()=>{
 const entries=[{name:'Scallions',status:'low',quantity:3,unit:'each'},{name:'Family spice mix',status:'owned'}];
 const before=JSON.stringify(entries);
 const matches=pantryPickerMatches(entries,options,'green onion');
 assert.equal(matches.length,1);assert.equal(matches[0].entry,entries[0]);assert.equal(matches[0].name,'Scallions');
 assert.equal(pantryPickerMatches(entries,options,'family')[0].entry,entries[1]);
 assert.equal(pantryPickerMatches(entries,options,'carrot')[0].entry,undefined);
 assert.equal(JSON.stringify(entries),before);
});
test('already added exact matches rank first and explicit add prevents alias duplicates',()=>{
 const entries=[{name:'Rice',status:'owned'}];
 assert.equal(pantryPickerMatches(entries,options,'rice')[0].entry,entries[0]);
 const withAlias=[{name:'Scallions',status:'owned',quantity:3,unit:'each'}];
 assert.equal(addPantryEntry(withAlias,'Green onions'),withAlias);
 const added=addPantryEntry(withAlias,'Family spice mix');
 assert.equal(added.length,2);assert.equal(added[1].quantity,undefined);
});
test('grouping preserves custom data and quantities without conflating formulations',()=>{
 const entries=normalizePantry(['Scallions','Garlic cloves','Garlic powder','Milk','Oat milk','Dried basil','Fresh basil',{name:'Family spice mix',quantity:0.25,unit:'tsp',status:'low'}]);
 const before=JSON.stringify(entries),groups=pantryGroups(entries,options);
 assert.deepEqual(groups.find(g=>g.name==='Produce').entries.map(e=>e.name),['Garlic cloves','Scallions']);
 assert.equal(groups.find(g=>g.name==='Spices').entries.length,1);
 assert.deepEqual(groups.find(g=>g.name==='Other & custom').entries.map(e=>e.name),['Family spice mix']);
 assert.equal(groups.flatMap(g=>g.entries).length,entries.length);
 assert.equal(JSON.stringify(entries),before);
});
test('summary distinguishes unknown amount, zero, measured stock and labels',()=>{
 assert.equal(pantrySummary({name:'Rice',status:'owned'}),'Amount unknown');
 assert.equal(pantrySummary({name:'Rice',status:'stocked'}),'Amount unknown · Fully stocked label');
 assert.equal(pantrySummary({name:'Rice',status:'low',quantity:0,unit:'cup'}),'0 cups · Running low');
 assert.equal(pantrySummary({name:'Oil',status:'restock',quantity:1,unit:'bottle'}),'1 bottle · Restock');
 assert.equal(PANTRY_PAGE_SIZE,12);
});
test('edited and custom pantry payloads retain existing owner boundaries and exclude week confirmations',()=>{
 const entries=normalizePantry([{name:'Rice',quantity:1.5,unit:'cup',status:'low',confirmedFor:'week-1'},{name:'Custom spice',status:'owned'}]);
 assert.equal(readOwnedPantry({owner:'a',entries},'b').length,0);
 assert.deepEqual(readOwnedPantry({owner:'a',entries},'a'),entries);
 const payload=pantryCloudPayload(entries);
 assert.equal(payload[0].quantity,1.5);assert.equal(payload[0].status,'low');assert.equal(payload[0].confirmedFor,undefined);
 assert.equal(payload[1].quantity,undefined);
});
