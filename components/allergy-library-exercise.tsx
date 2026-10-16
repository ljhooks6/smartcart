"use client";
import { createClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";
import type { ReviewedPlan } from "@/lib/allergy-aware-planner";

const control="mt-1 min-h-11 w-full rounded-lg border border-pine/50 bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";
export function AllergyLibraryExercise({diet,budget,avoid}:{diet:string;budget:number;avoid:string}){
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[signedIn,setSignedIn]=useState(false);
  const bearer=useRef<string|null>(null),pending=useRef<{key:string;input:unknown;context:string}|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[plan,setPlan]=useState<ReviewedPlan|null>(null),[provenance,setProvenance]=useState("");
  const [vaultId,setVaultId]=useState("");const result=useRef<HTMLHeadingElement>(null);
  const [checkedContext,setCheckedContext]=useState(""),[pendingContext,setPendingContext]=useState("");
  const currentContext=JSON.stringify([diet,budget,avoid]);
  const visiblePlan=checkedContext===currentContext?plan:null;
  async function signIn(){
    setBusy(true);setMessage("");
    try{
      const config=await fetch("/api/labs/allergy-library",{cache:"no-store"});const data=await config.json();
      if(!config.ok)throw Error(data.error);
      const client=createClient(data.url,data.anonKey,{auth:{autoRefreshToken:false,persistSession:false}});
      const login=await client.auth.signInWithPassword({email,password});
      if(login.error||!login.data.session)throw Error("Local sign-in failed. Use only an allowlisted disposable lab account.");
      bearer.current=login.data.session.access_token;setPassword("");setSignedIn(true);setMessage("Signed in locally. Server authorization and the synthetic-user allowlist are checked on every operation.");
    }catch(error){setMessage(error instanceof Error?error.message:"Local sign-in unavailable.");}finally{setBusy(false);}
  }
  async function command(body:Record<string,unknown>){
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/labs/allergy-library",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${bearer.current??""}`},body:JSON.stringify(body)});
      const data=await response.json();if(!response.ok)throw Error(data.error);
      if(data.plan){setPlan(data.plan);setCheckedContext(currentContext);}if(data.provenance)setProvenance(data.provenance);if(data.id)setVaultId(data.id);
      if(data.job?.status==="failed")throw Error(data.job.error??"Local planning failed; its allowance was released.");
      setMessage(data.saved?"Saved to this disposable account. Existing database ownership and tier limits apply.":data.reused?"Reopened the same request; no extra allowance was consumed.":"Local operation completed. Actual product labels and cross-contact remain unverified.");
      requestAnimationFrame(()=>result.current?.focus());
    }catch(error){setMessage(error instanceof Error?error.message:"Local operation unavailable.");}finally{setBusy(false);}
  }
  function generate(retry:boolean){
    if(!retry||!pending.current||pending.current.context!==currentContext){pending.current={key:crypto.randomUUID(),context:currentContext,input:{diet,budget,avoidIngredients:avoid,householdSize:2,count:7,includeDessert:true,availableEquipment:["Oven","Stovetop"],maxMinutes:60}};setPendingContext(currentContext);}
    void command({action:"generate",requestKey:pending.current.key,input:pending.current.input,rejected:[]});
  }
  function clearSession(){bearer.current=null;pending.current=null;setSignedIn(false);setPlan(null);setProvenance("");setVaultId("");setMessage("Local session cleared.");}
  return <section className="space-y-4 rounded-xl border border-pine/40 bg-white p-4" aria-labelledby="local-storage-heading">
    <h2 id="local-storage-heading" className="text-2xl font-bold text-pine">Authenticated local storage exercise</h2>
    <p>Disposable local accounts only. Do not enter a real account password. Hosted access is disabled. This separate exercise can save synthetic content to the local Vault and week; it never calls an AI provider.</p>
    {!signedIn?<form className="space-y-3" onSubmit={e=>{e.preventDefault();void signIn();}}>
      <label className="block">Disposable local email<input className={control} type="email" pattern=".+@example\.invalid" autoComplete="off" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="block">Disposable local password<input className={control} type="password" autoComplete="off" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button disabled={busy} className="min-h-11 rounded-lg bg-pine px-4 py-3 text-white">Sign in to local lab</button>
    </form>:<>
      <p>Uses the exclusions, budget and avoidance above; seven dinners, one dessert, two servings, Oven + Stovetop, up to 60 estimated minutes. One completed plan uses one existing weekly allowance. These are engineering candidates, not professionally reviewed recipes.</p>
      <div className="flex flex-wrap gap-3"><button disabled={busy} type="button" className="min-h-11 rounded-lg bg-pine px-4 py-3 text-white" onClick={()=>generate(false)}>Generate a new local plan</button><button disabled={busy||pendingContext!==currentContext} type="button" className="min-h-11 px-3 py-3 text-pine underline" onClick={()=>generate(true)}>Reopen or retry same request</button><button disabled={busy} type="button" className="min-h-11 px-3 py-3 text-pine underline" onClick={clearSession}>Clear local session</button></div>
      {provenance&&visiblePlan?<div className="flex flex-wrap gap-3"><button disabled={busy} type="button" className="min-h-11 px-3 py-3 text-pine underline" onClick={()=>void command({action:"save-week",provenance,currentDiet:diet,avoidIngredients:avoid})}>Save week locally</button>{vaultId?<button disabled={busy} type="button" className="min-h-11 px-3 py-3 text-pine underline" onClick={()=>void command({action:"open",table:"vault",id:vaultId,currentDiet:diet,avoidIngredients:avoid})}>Reopen saved Vault recipe</button>:null}</div>:null}
    </>}
    <p role="status" aria-live="polite">{busy?"Checking the local operation…":message}</p>
    {plan&&!visiblePlan?<p role="status">Settings changed. The previous result is not a current ingredient-source check; generate a new plan.</p>:null}
    {visiblePlan?<section aria-label="Authenticated local result"><h3 tabIndex={-1} ref={result} className="text-xl font-bold text-pine">Declared ingredient-source checks</h3><p>{visiblePlan.notice}</p><p className="mt-2">{visiblePlan.rotation.message}</p>
      <div className="mt-3 space-y-3">{visiblePlan.meals.map(meal=><article key={meal.id} className="rounded-lg border border-pine/30 p-3"><h4 className="font-semibold">{meal.name}</h4><p>{meal.description}</p><p className="text-sm">Engineering candidate · {meal.minutes} estimated minutes · serves {meal.servings}</p><details><summary className="min-h-11 cursor-pointer py-3">Ingredients and fixed cooking steps</summary><ul className="list-disc pl-5">{meal.ingredients.map(i=><li key={i.foodId}>{i.quantity} {i.unit} {i.name}</li>)}</ul><ol className="mt-3 list-decimal space-y-2 pl-5">{meal.steps.map((step,i)=><li key={i}>{step}</li>)}</ol></details><button type="button" disabled={busy} className="min-h-11 px-2 py-3 text-pine underline" onClick={()=>void command({action:"save-vault",provenance,recipeId:meal.id,currentDiet:diet,avoidIngredients:avoid})}>Save {meal.name} to local Vault</button></article>)}</div>
      <details><summary className="min-h-11 cursor-pointer py-3">Canonical grocery requirements</summary><ul className="list-disc pl-5">{visiblePlan.groceries.map(i=><li key={i.foodId}>{i.quantity} {i.unit} {i.name}</li>)}</ul></details>
    </section>:null}
  </section>;
}
