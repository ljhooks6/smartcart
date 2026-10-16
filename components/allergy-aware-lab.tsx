"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { allergens, writeDiet } from "@/lib/dietary-safety";
import type { PlanResult } from "@/lib/allergy-aware-planner";
import type { auditAllergyDraft } from "@/lib/allergy-aware-policy";

type DraftReview=ReturnType<typeof auditAllergyDraft>;
const control="mt-1 min-h-11 w-full rounded-lg border border-pine/50 bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
export function AllergyAwareLab(){
  const [selected,setSelected]=useState<string[]>(["Milk","Sesame"]);
  const [count,setCount]=useState(3),[budget,setBudget]=useState(80),[avoid,setAvoid]=useState("");
  const [intolerance,setIntolerance]=useState(""),[preference,setPreference]=useState("");
  const [result,setResult]=useState<PlanResult|null>(null),[audit,setAudit]=useState<DraftReview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const summary=useRef<HTMLHeadingElement>(null);
  const diet=()=>writeDiet("No preference",{allergies:selected,preferences:preference?[preference]:[],customAllergies:"",intolerances:intolerance,medical:""});
  async function send(kind:"plan"|"conflict"|"unknown"){
    setBusy(true);setError("");setResult(null);setAudit(null);
    try{
      const payload=kind==="plan"?{diet:diet(),householdSize:2,budget,count,includeDessert:true,availableEquipment:["Stovetop","Oven"],maxMinutes:45,avoidIngredients:avoid}
        :{diet:diet(),draft:kind==="conflict"?{title:"Lemon dressing",ingredients:[{name:"Tahini"}],steps:["Mix the ingredients."]}:{title:"Vegetable soup",ingredients:[{name:"Chicken stock"},{name:"Carrots"}],steps:["Simmer the vegetables in the stock."]}};
      const response=await fetch("/api/labs/allergy-aware",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();
      if(kind==="plan"&&"ok" in data)setResult(data);else if(kind!=="plan"&&"findings" in data)setAudit(data);else throw Error();
      requestAnimationFrame(()=>summary.current?.focus());
    }catch{setError("The local example could not be checked. Keep restrictions entered and try again.");}
    finally{setBusy(false);}
  }
  return <main className="min-h-screen bg-cream px-4 py-6 text-ink"><div className="mx-auto max-w-3xl space-y-6">
    <header><p className="font-semibold text-pine">MealCaddie · local engineering review</p><h1 className="mt-2 text-3xl font-bold text-pine">Try the ingredient-source planning prototype</h1><p className="mt-3">This laboratory is disabled on hosted Preview and Production. It uses authored recipes and synthetic examples, saves no account data and makes no AI calls.</p></header>
    <aside aria-label="What this review means" className="rounded-xl border border-pine/40 bg-white p-4"><p>It checks declared ingredient sources. It cannot verify real product labels, brand formulations, manufacturing, kitchen handling or cross-contact. A checked recipe is not a guarantee of allergen absence. These recipes still need qualified and practical review.</p><Link className="mt-2 inline-block min-h-11 py-3 text-pine underline" href="/legal/safety">Read the complete dietary safety notice</Link></aside>
    <form className="space-y-5 rounded-xl bg-white p-4" onSubmit={e=>{e.preventDefault();void send("plan");}}>
      <fieldset><legend className="font-semibold">Food-allergy source exclusions</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{allergens.map(a=><label key={a} className="flex min-h-11 items-center gap-3"><input className="h-5 w-5" type="checkbox" checked={selected.includes(a)} onChange={e=>setSelected(e.target.checked?[...selected,a]:selected.filter(v=>v!==a))}/>{a}</label>)}</div></fieldset>
      <div className="grid gap-4 sm:grid-cols-2"><label>Dinners<select className={control} value={count} onChange={e=>setCount(Number(e.target.value))}><option value={1}>1 dinner</option><option value={3}>3 dinners</option><option value={7}>7 dinners</option></select></label><label>Illustrative grocery budget ($)<input className={control} type="number" min={1} max={10000} value={budget} onChange={e=>setBudget(Number(e.target.value))}/></label></div>
      <label className="block">Ingredient avoidance (separate from allergies)<input className={control} value={avoid} onChange={e=>setAvoid(e.target.value)} maxLength={2000} placeholder="For example: mushrooms"/></label>
      <label className="block">Intolerance strategy<select className={control} value={intolerance} onChange={e=>setIntolerance(e.target.value)}><option value="">None</option><option value="lactose intolerance">Lactose intolerance — conservatively exclude milk sources</option><option value="histamine">Histamine intolerance — unsupported example</option></select></label>
      <label className="block">Dietary preference<select className={control} value={preference} onChange={e=>setPreference(e.target.value)}><option value="">No preference</option><option>Vegetarian</option><option>Vegan</option><option>Gluten-free</option></select></label>
      <p className="text-sm">Two servings; one dessert; Stovetop and Oven; at most 45 minutes. Prices are illustrative ingredient-use estimates. Pantry quantities and strict constraint failures are covered in the reproducible offline scenarios.</p>
      <button className="min-h-12 rounded-xl bg-pine px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">{busy?"Checking…":"Build a reviewed-recipe example"}</button>
      <div className="flex flex-wrap gap-3"><button className="min-h-11 px-2 py-3 text-pine underline" disabled={busy} type="button" onClick={()=>void send("conflict")}>Check a tahini conflict</button><button className="min-h-11 px-2 py-3 text-pine underline" disabled={busy} type="button" onClick={()=>void send("unknown")}>Check unresolved stock</button></div>
    </form>
    {error?<p role="alert">{error}</p>:null}
    {result||audit?<section aria-label="Review result" className="space-y-4"><h2 className="text-2xl font-bold text-pine" ref={summary} tabIndex={-1}>{result?.ok?"Declared ingredient sources checked":"This candidate needs review"}</h2>
      {result&&!result.ok?<ul role="alert" className="list-disc pl-5">{result.findings.map((f,i)=><li key={i}>{f.message}</li>)}</ul>:null}
      {audit?<><p>{audit.message}</p><ul role="alert" className="list-disc pl-5">{audit.findings.map((f,i)=><li key={i}>{f.message}</li>)}</ul></>:null}
      {result?.ok?<><p>{result.plan.notice}</p><p>Illustrative groceries: ${result.plan.estimatedCost.toFixed(2)}. Catalog {result.plan.catalogVersion}.</p>{result.plan.meals.map(m=><article className="rounded-xl border border-pine/30 bg-white p-4" key={m.id}><p className="text-sm">{m.kind} · {m.minutes} minutes · serves {m.servings}</p><h3 className="mt-1 text-xl font-semibold text-pine">{m.name}</h3><p className="mt-2">{m.description}</p><details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-pine">Ingredients and fixed cooking steps</summary><ul className="list-disc pl-5">{m.ingredients.map(i=><li key={i.foodId}>{i.quantity} {i.unit} {i.name}</li>)}</ul><ol className="mt-4 list-decimal space-y-2 pl-5">{m.steps.map((s,i)=><li key={i}>{s}</li>)}</ol></details></article>)}<details><summary className="min-h-11 cursor-pointer py-3 font-semibold text-pine">Reviewed grocery requirements</summary><ul className="list-disc pl-5">{result.plan.groceries.map(i=><li key={i.foodId}>{i.quantity} {i.unit} {i.name}</li>)}</ul></details></>:null}
    </section>:null}
  </div></main>;
}
