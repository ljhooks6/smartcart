// Only the owner-started synthetic lab imports this recorder. Never called by
// production routes or telemetry; retain measurement fields, not raw responses.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {loader} from './load-ts.mjs';
import {measuredFixture} from './local-real-provider-scope.mjs';
const {fitPantryPlan}=loader()('lib/pantry-plan-quantities.ts');
const input={combinedPantryItems:measuredFixture.map(r=>r[0]).join(', '),pantryInventory:measuredFixture.map(([name,quantity,unit])=>({name,quantity,unit,status:'owned'}))};
export function recordSyntheticQuantityDiagnostics(file,reply,attempt){
 if(reply.status!==200)return;
 let raw;
 try{raw=JSON.parse(reply.body.choices[0].message.content);}catch{return;}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
 const project=(rows,max)=>Array.isArray(rows)?rows.slice(0,max).map(d=>({ingredients:Array.isArray(d?.ingredients)?d.ingredients.slice(0,60).map(i=>({name:typeof i?.name==='string'?i.name.slice(0,160):'',amount:typeof i?.amount==='string'?i.amount.slice(0,100):''})):[]})):[];
 const review=fitPantryPlan(project(raw.meals,7),project(raw.desserts,2),input);
 const receipt=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{syntheticOnly:true,quantityDiagnosticsOnly:true,notApplicationAcceptance:true,attempts:[]};
 receipt.attempts.push({attempt,checkedDinners:Math.min(raw.meals?.length||0,7),rejections:review.rejections});
 writeFileSync(file,JSON.stringify(receipt,null,2));
}
