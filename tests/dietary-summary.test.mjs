import test from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './helpers/load-ts.mjs';
const load=loader();
const {dietarySummary}=load('lib/dietary-summary.ts');
const {writeDiet}=load('lib/dietary-safety.ts');
test('structured review summarizes every restriction without modifying stored input',()=>{
 const settings={allergies:['Milk','Sesame'],preferences:['Vegetarian','Low sodium'],customAllergies:'Kiwi',intolerances:'Lactose',medical:'Clinician-guided diet'};
 const diet=writeDiet('Family preference',settings),original=diet;
 const result=dietarySummary(diet);
 for(const part of ['Family preference','Milk, Sesame','Vegetarian, Low sodium','Kiwi','Lactose','Clinician-guided diet'])assert.ok(result.rows.some(row=>row.includes(part)));
 assert.equal(diet,original);assert.equal(result.warning,null);
 assert.doesNotMatch(result.rows.join(' '),/MealCaddie dietary settings v1|\{|\}/);
});
test('legacy, empty and malformed entries remain understandable',()=>{
 assert.deepEqual(dietarySummary('Vegan, no mushrooms').rows,['Original entry: Vegan, no mushrooms']);
 assert.deepEqual(dietarySummary('').rows,['No dietary settings entered.']);
 for(const diet of ['Legacy\nMealCaddie dietary settings v1: {bad}','MealCaddie dietary settings v1: {bad}',writeDiet('Legacy',{allergies:['Invalid']})]){
  const result=dietarySummary(diet);assert.match(result.warning,/original data is preserved/);
  assert.doesNotMatch(result.rows.join(' '),/MealCaddie dietary settings v1|\{|\}|Invalid/);
 }
});
