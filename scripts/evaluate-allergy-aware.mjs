// OFFLINE ONLY. No SDK, API key, network request or provider invocation.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loader} from '../tests/helpers/load-ts.mjs';
import {base,dietary,planningCases,draftCases,sourceAllergens} from '../evals/allergy-aware-cases.mjs';
const load=loader(),planner=load('lib/allergy-aware-planner.ts'),catalog=load('lib/allergy-aware-catalog.ts');
const {auditAllergyDraft}=load('lib/allergy-aware-policy.ts');
const old=load('lib/dietary-candidate.ts');
const {reviewedRecipes}=load('lib/allergy-aware-recipes.ts');
const output=process.argv[2]??'evals/allergy-aware-results.json';
const rawPath=process.argv[3];
const scenarios=planningCases.map(c=>{
 const r=planner.createAllergyAwarePlan(c.input);
 if(r.ok!==c.expected)throw Error('Unexpected scenario outcome: '+c.id);
 return {id:c.id,expected:c.expected,accepted:r.ok,...r.ok?{menu:r.plan.meals.map(m=>m.name),estimatedIngredientCost:r.plan.estimatedCost,quarantinedPantry:r.plan.quarantinedPantry.map(f=>f.code)}:{findings:r.findings}};
});
const negatives=draftCases.map(c=>{const r=auditAllergyDraft(c.draft,{diet:dietary(c.allergies)});if(!r.findings.length||r.releaseEligible)throw Error('Unsafe draft not blocked: '+c.id);return {id:c.id,status:r.status,findings:r.findings};});
const examples=['lemon-chicken','chickpea-tomato-stew','berry-oat-crisp'].map(id=>{
 const dessert=id==='berry-oat-crisp';
 const r=planner.createAllergyAwarePlan({...base,count:1,includeDessert:dessert,selectedRecipeIds:dessert?['chickpea-tomato-stew',id]:[id]});
 if(!r.ok)throw Error('Example did not pass: '+id);
 return r.plan.meals.find(m=>m.id===id);
});
let offlineReplay;
if(rawPath){
 const bytes=fs.readFileSync(rawPath),raw=JSON.parse(bytes);
 const parsedRecords=[],seen=new Set();
 for(const record of [...raw.results,...raw.finalReplays])for(const provider of record.providerRecords??[]){
  if(typeof provider.content!=='string')continue;
  const hash=createHash('sha256').update(provider.content).digest('hex');if(seen.has(hash))continue;seen.add(hash);
  try{parsedRecords.push({key:record.key,input:record.input,content:JSON.parse(provider.content),hash});}catch{/* malformed response cannot be accepted */}
 }
 const allergyRecords=parsedRecords.filter(r=>/^(?:common-allergen|multiple-restrictions)\//.test(r.key));
 const ingredientNames=[];
 function ingredients(v){if(Array.isArray(v)){v.forEach(ingredients);return;}if(!v||typeof v!=='object')return;for(const [key,value] of Object.entries(v)){if(key==='ingredients'&&Array.isArray(value))ingredientNames.push(...value.map(i=>typeof i==='string'?i:i?.name).filter(n=>typeof n==='string'));else ingredients(value);}}
 parsedRecords.forEach(r=>ingredients(r.content));
 const frequency=new Map();for(const n of ingredientNames)if(!catalog.resolveFoodName(n))frequency.set(n,(frequency.get(n)??0)+1);
 const originalAllergyReplay=allergyRecords.map(r=>{
  const audited=auditAllergyDraft(r.content,{diet:r.input.diet});
  const oldIssues=old.candidateOutputIssues(r.content,r.input);
  return {case:r.key,responseSHA256:r.hash,oldCandidateAccepted:oldIssues.length===0,ingredientAuditStatus:audited.status,releaseEligible:audited.releaseEligible,
   issues:audited.findings.slice(0,12),fullIssueCount:audited.findings.length,menu:r.content.meals?.map(m=>m.name),desserts:r.content.desserts?.map(m=>m.title)};
 });
 const sameScenarioRebuild=[...new Map(allergyRecords.map(r=>[r.key,r])).values()].map(r=>{
  const input={...base,diet:r.input.diet,budget:r.input.budget,householdSize:r.input.householdSize,includeDessert:!!r.input.includeDessert,
   availableEquipment:r.input.availableEquipment.filter(e=>['Stovetop','Oven'].includes(e)),maxMinutes:r.input.prepTime?.includes('30')?30:45};
  const built=planner.createAllergyAwarePlan(input);
  return {case:r.key,method:'New deterministic reviewed-recipe plan under original source exclusions/budget/household/equipment/time; NOT corrected AI output or independent model evaluation',accepted:built.ok,...built.ok?{menu:built.plan.meals.map(m=>m.name),estimatedIngredientCost:built.plan.estimatedCost}:{findings:built.findings}};
 });
 offlineReplay={evidenceSHA256:createHash('sha256').update(bytes).digest('hex'),uniqueParsedProviderResponses:parsedRecords.length,originalAllergyResponses:allergyRecords.length,
  ingredientEntries:ingredientNames.length,exactCatalogResolved:ingredientNames.filter(n=>catalog.resolveFoodName(n)).length,
  unresolvedMostFrequent:[...frequency].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([name,count])=>({name,count})),originalAllergyReplay,sameScenarioRebuild};
}
const report={method:'Offline reference-recipe planning, adversarial mutation and replay of previously paid synthetic provider responses. No clinical, manufacturer, cooking or new live-model validation.',catalogVersion:catalog.catalogVersion,
 authoredRecipes:reviewedRecipes.length,plainFoodProfiles:catalog.foodCatalog.length,homemadeComponents:Object.keys(catalog.homemadeComponents).length,
 sourceExclusions:sourceAllergens,scenarios,negativeDrafts:negatives,acceptedRecipeExamples:examples,offlineReplay,
 newProviderCalls:0,newAiCostUSD:0,releaseRecommendation:'Local engineering review only. Consider a reviewed-recipe source-exclusion pilot after qualified catalog/recipe review and owner approval; do not enable unconstrained AI allergy generation.'};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:output,scenarios:scenarios.length,accepted:scenarios.filter(s=>s.accepted).length,expectedRejections:scenarios.filter(s=>!s.accepted).length,
 negativeDraftsBlocked:negatives.length,authoredRecipes:report.authoredRecipes,foodProfiles:report.plainFoodProfiles,offlineResponses:offlineReplay?.uniqueParsedProviderResponses,allergyResponses:offlineReplay?.originalAllergyResponses,newProviderCalls:0}));
