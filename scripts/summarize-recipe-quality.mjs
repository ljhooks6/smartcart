import fs from 'node:fs';import {createHash} from 'node:crypto';
const input=process.argv[2],output=process.argv[3];if(!input||!output)throw Error('Usage: node scripts/summarize-recipe-quality.mjs <private-raw-json> <summary-json>');
const raw=fs.readFileSync(input),r=JSON.parse(raw);
const selected=[...r.results.filter(x=>x.key.endsWith('/before')),...r.finalReplays];
const summary={method:'40 unique case/tier/variant runs, with final candidate validator replay and remaining bounded correction slots; exploratory, not independent final-head resampling',baseline:r.baseline,providerCalls:r.calls,estimatedCostUSD:Number(r.spentUSD.toFixed(6)),ceilingUSD:15,rawEvidenceSHA256:createHash('sha256').update(raw).digest('hex'),results:selected.map(x=>({key:x.key,status:x.status,providerResponses:x.providerRecords?.length||0,estimatedIngredientTotal:x.result?.estimated_total_cost,menu:x.result?.meals?.map(m=>m.name),desserts:x.result?.desserts?.map(d=>d.title),separateDescriptions:x.result?.meals?.filter(m=>typeof m.description==='string'&&m.description.trim()).length,error:x.status===200?undefined:x.result?.error}))};
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
