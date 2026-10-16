"use client";
// Local runtime for the ordinary application sections. No shared Supabase client,
// AI route, telemetry, email or client recipe cache is used by this adapter.
import {createClient} from "@supabase/supabase-js";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {writeDiet} from "@/lib/dietary-safety";
import type {ReviewedPlan} from "@/lib/allergy-aware-planner";
import type {LibraryRecipe} from "@/lib/allergy-library-service";
import type {CookingDay} from "@/lib/meal-schedule";
import {MealCaddieLogo} from "./mealcaddie-logo";
import {SmartCartWeekDashboard} from "./smart-cart-week-dashboard";
import {SmartCartMealSections} from "./smart-cart-meal-sections";
import {SmartCartCookSections} from "./smart-cart-cook-sections";
import {SmartCartLibrarySections} from "./smart-cart-library-sections";
import {SmartCartGrocerySidebar} from "./smart-cart-grocery-sidebar";
import {SmartCartRecipeModal} from "./smart-cart-recipe-modal";
import {SmartCartDialog} from "./smart-cart-dialog";

type Tab="week"|"plan"|"meals"|"shop"|"cook"|"vault";
type Basket={foodId:string;name:string;quantity:number;unit:string;estimatedCost:number}[];
type Reply={error?:string;job?:{id:string;status:string;error?:string};recipes?:LibraryRecipe[];plan?:ReviewedPlan;provenance?:string;week?:LibraryRecipe[];vault?:LibraryRecipe[];unavailable?:number;featurePlan?:"free"|"plus";groceries?:Basket;notice?:string;recipe?:LibraryRecipe;alternatives?:{id:string;name:string}[]};
type View={key:string;recipes:LibraryRecipe[];plan?:ReviewedPlan;week:LibraryRecipe[];vault:LibraryRecipe[];unavailable:number;featurePlan:"free"|"plus";basket:Basket;basketNotice:string};
const control="mt-1 min-h-11 w-full rounded-xl border border-pine/40 bg-white p-3";
const button="min-h-11 rounded-xl bg-pine px-4 py-3 font-semibold text-white disabled:opacity-50";
const notice="Engineering candidates: not professionally reviewed or cooking-tested. Checks cover declared ingredient sources only. Actual labels, brand formulations, manufacturing, cross-contact and preparation are unverified. No guarantee of allergen absence. Do not substitute ingredients without rechecking.";
const entries=(meals:LibraryRecipe[])=>meals.map(m=>({provenance:m.library.provenance,recipeId:m.library.recipeId,...(m.scheduledDay?{scheduledDay:m.scheduledDay}:{})}));
const money=(n:number)=>`$${n.toFixed(2)}`;

export function AllergyLibraryApplication(){
  const [session,setSession]=useState<{id:string;token:string}|null>(null),[email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [selected,setSelected]=useState(["Milk","Eggs","Peanuts","Sesame"]),[avoid,setAvoid]=useState(""),[preference,setPreference]=useState("");
  const [budget,setBudget]=useState(150),[household,setHousehold]=useState(2),[minutes,setMinutes]=useState(60),[equipment,setEquipment]=useState(["Oven","Stovetop"]);
  const [pantry,setPantry]=useState(""),[pantryOnly,setPantryOnly]=useState(false),[dessert,setDessert]=useState(true);
  const [tab,setTab]=useState<Tab>("plan"),[view,setView]=useState<View|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const [expanded,setExpanded]=useState(new Set<string>()),[vaultOpen,setVaultOpen]=useState(true),[checked,setChecked]=useState(new Set<string>());
  const [cooked,setCooked]=useState({owner:"",count:0});
  const [active,setActive]=useState<{key:string;meal:LibraryRecipe}|null>(null),[replace,setReplace]=useState<{meal:LibraryRecipe;slot:number;choices:{id:string;name:string}[]}|null>(null);
  const heading=useRef<HTMLHeadingElement>(null),lock=useRef(false),job=useRef<{key:string;id:string}|null>(null),artifact=useRef<{key:string;provenance:string}|null>(null),pending=useRef<{key:string;id:string;input:Record<string,unknown>;rejected:string[]}|null>(null),rejected=useRef<string[]>([]);
  const diet=writeDiet("No preference",{allergies:selected,preferences:preference?[preference]:[],customAllergies:"",intolerances:"",medical:""});
  const key=JSON.stringify([session?.id,diet,avoid,budget,household,minutes,equipment,pantry,pantryOnly,dessert]);
  const current=useRef(key);current.current=key;
  const visible=view?.key===key?view:null;
  async function api(body:Record<string,unknown>,capture=key):Promise<Reply>{
    const response=await fetch("/api/labs/allergy-library",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.token??""}`},body:JSON.stringify({...body,currentDiet:diet,avoidIngredients:avoid,...(body.action==="generate"?{currentDiet:undefined,avoidIngredients:undefined}:{})})});
    const data:Reply=await response.json();
    if(current.current!==capture)throw Error("Settings or account changed. The old response was discarded.");
    if(!response.ok)throw Error(data.error??"The local operation could not be verified.");
    if(data.job?.status==="failed")throw Error(data.job.error??"Planning failed; the unused allowance was released.");return data;
  }
  async function run(work:()=>Promise<void>){
    if(lock.current)return;lock.current=true;setBusy(true);setMessage("");const capture=key;
    try{await work();}catch(error){if(current.current===capture){setActive(null);setReplace(null);setView(null);setMessage(error instanceof Error?error.message:"Local verification unavailable. Stored content is preserved.");}}
    finally{lock.current=false;setBusy(false);}
  }
  async function refresh(){
    const capture=key;setView(null);
    const inventory=await api({action:"inventory"},capture);
    const generated=artifact.current?.key===capture?await api({action:"artifact",provenance:artifact.current.provenance},capture):job.current?.key===capture?await api({action:"job",id:job.current.id},capture):null;
    const basket=await api({action:"basket",entries:entries(inventory.week??[])},capture);
    if(current.current!==capture)return;
    setView({key:capture,recipes:generated?.recipes??[],plan:generated?.plan,week:inventory.week??[],vault:inventory.vault??[],featurePlan:inventory.featurePlan??"free",unavailable:inventory.unavailable??0,basket:basket.groceries??[],basketNotice:basket.notice??""});
  }
  // No local content cache is trusted. Account/settings changes hide old results
  // during render; late responses are rejected by the captured context above.
  useEffect(()=>{setActive(null);setReplace(null);setChecked(new Set());if(session)void run(refresh);/* capture this exact context */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key]);
  useEffect(()=>{const focus=()=>{setActive(null);setReplace(null);if(session)void run(refresh);};const visibility=()=>{if(document.hidden){setView(null);setActive(null);setReplace(null);}else focus();};window.addEventListener("focus",focus);document.addEventListener("visibilitychange",visibility);return()=>{window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",visibility);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key]);
  const navigate=(next:Tab)=>{setTab(next);requestAnimationFrame(()=>heading.current?.focus());};
  const toggle=(value:string)=>setExpanded(old=>{const next=new Set(old);if(next.has(value))next.delete(value);else next.add(value);return next;});
  async function signIn(){await run(async()=>{
    const response=await fetch("/api/labs/allergy-library",{cache:"no-store"}),config=await response.json();if(!response.ok)throw Error(config.error);
    const client=createClient(config.url,config.anonKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
    const login=await client.auth.signInWithPassword({email,password});if(login.error||!login.data.session)throw Error("Use only an allowlisted disposable local account.");
    const identity={id:login.data.user.id,token:login.data.session.access_token};setSession(identity);setPassword("");setMessage("Signed in to the disposable local runtime.");
  });}
  function clear(){current.current="cleared";setSession(null);setPassword("");setView(null);setActive(null);setReplace(null);job.current=null;artifact.current=null;pending.current=null;rejected.current=[];setCooked({owner:"",count:0});setMessage("Local session cleared. No account was modified.");}
  async function generate(retry=false){await run(async()=>{
    let parsedPantry:unknown=[];try{parsedPantry=pantry.trim()?JSON.parse(pantry):[];}catch{throw Error("Pantry must be a JSON array of exact ingredient names, positive quantities and g/ml/each units.");}
    if(!retry||pending.current?.key!==key)pending.current={key,id:crypto.randomUUID(),input:{diet,avoidIngredients:avoid,budget,householdSize:household,count:7,includeDessert:dessert,availableEquipment:equipment,maxMinutes:minutes,pantry:parsedPantry,mealSourceMode:pantryOnly?"pantry-only":"pantry-and-store"},rejected:[...rejected.current]};
    const result=await api({action:"generate",requestKey:pending.current!.id,input:pending.current!.input,rejected:pending.current!.rejected});
    if(result.job?.status!=="completed")throw Error("This request is still running. Retry the same request without changing settings.");
    artifact.current=null;job.current={key,id:result.job.id};await refresh();navigate("meals");setMessage("Seven dinner candidates checked. One existing weekly plan allowance used; reopening this request uses none.");
  });}
  const all=[...(visible?.recipes??[]),...(visible?.week??[]),...(visible?.vault??[])];
  function resolve(m:{name:string}){const {library:ref,dbId}=(m as Partial<LibraryRecipe>);const found=ref&&all.find(r=>r.library.provenance===ref.provenance&&r.id===ref.recipeId&&(!dbId||r.dbId===dbId));if(!found)throw Error("Reopen this exact signed recipe from this account; a title alone cannot identify it.");return found;}
  const saveWeek=(meals:LibraryRecipe[])=>api({action:"selection",entries:entries(meals)});
  async function choose(m:{name:string}){await run(async()=>{const recipe=resolve(m);await api({action:"recipe",provenance:recipe.library.provenance,recipeId:recipe.id});await saveWeek([...(visible?.week??[]).filter(r=>r.id!==recipe.id),recipe]);await refresh();setMessage("Added to This Week and the checked shopping requirements.");});}
  async function archive(m:{name:string}){await run(async()=>{const recipe=resolve(m);await api({action:"save-vault",provenance:recipe.library.provenance,recipeId:recipe.id});await refresh();setMessage("Saved to local Vault. Existing database tier limits apply.");});}
  async function open(m:{name:string}){await run(async()=>{const recipe=resolve(m),result=await api({action:"recipe",provenance:recipe.library.provenance,recipeId:recipe.id});if(!result.recipe)throw Error("Recipe verification unavailable.");setActive({key,meal:result.recipe});});}
  async function remove(m:{name:string}){await run(async()=>{const recipe=resolve(m);await saveWeek((visible?.week??[]).filter(r=>r.id!==recipe.id));await refresh();setCooked(old=>({owner:session!.id,count:old.owner===session!.id?old.count+1:1}));setActive(null);setMessage("Cooked meal removed from This Week. Vault and previous jobs are preserved. The cooked count lasts for this local session.");});}
  async function schedule(m:{name:string},day:CookingDay|undefined){await run(async()=>{const recipe=resolve(m);await saveWeek((visible?.week??[]).map(r=>r.id===recipe.id?{...r,scheduledDay:day}:r));await refresh();});}
  async function alternatives(m:{name:string},slot:number){await run(async()=>{const recipe=resolve(m),result=await api({action:"alternatives",provenance:recipe.library.provenance,slot});setReplace({meal:recipe,slot,choices:result.alternatives??[]});});}
  async function replaceWith(id:string){if(!replace)return;await run(async()=>{const result=await api({action:"replace",provenance:replace.meal.library.provenance,slot:replace.slot,recipeId:id});if(!result.plan||!result.provenance)throw Error("Replacement unavailable.");
    rejected.current=[replace.meal.id,...rejected.current].slice(0,12);
    // A replacement is its own signed artifact. Keep it in memory, not a new
    // generation or a client recipe cache. It consumes no extra allowance.
    const recipes:LibraryRecipe[]=[];for(const meal of result.plan.meals){const checked=await api({action:"recipe",provenance:result.provenance,recipeId:meal.id});if(!checked.recipe)throw Error("Replacement verification unavailable.");recipes.push(checked.recipe);}
    setView(v=>v?.key===key?{...v,recipes,plan:result.plan}:null);artifact.current={key,provenance:result.provenance};job.current=null;setReplace(null);setMessage("Replacement checked against original and current exclusions and planning limits. No additional allowance used.");});}
  const dinners=(visible?.week??[]).filter(m=>m.kind==="dinner"),treats=(visible?.week??[]).filter(m=>m.kind==="dessert");
  const generatedDinners=(visible?.recipes??[]).filter(m=>m.kind==="dinner").map((m,i)=>({...m,day:`Dinner ${i+1}`}));
  const generatedDesserts=(visible?.recipes??[]).filter(m=>m.kind==="dessert").map(m=>({...m,title:m.name}));
  const selectedMealKeys=new Set(generatedDinners.filter(m=>visible?.week.some(r=>r.id===m.id)).map(m=>`${m.day}::${m.name}`));
  const groceries=visible?.basket??[],cost=groceries.reduce((n,i)=>n+i.estimatedCost,0);
  const guidance={showGuidance:false,onDismissGuidance:()=>{}};
  const blockedEdit=()=>setMessage("Ingredient changes and household extras are not checked in this candidate. Keep the canonical requirements; replan or use a compatible authored replacement.");
  const activeMeal=active?.key===key?active.meal:null;
  return <main className="min-h-screen bg-cream p-3 pb-28 text-ink sm:p-6 sm:pb-28"><div className="mx-auto max-w-5xl space-y-5">
    <header><MealCaddieLogo/><h1 className="mt-3 text-xl font-bold">Local application integration</h1><p>Disposable local accounts only. Engineering candidates; unavailable on hosted Preview and Production. No AI, external email or analytics calls.</p></header>
    {!session?<form className="space-y-4 rounded-2xl bg-white p-4" onSubmit={e=>{e.preventDefault();void signIn();}}><label className="block">Disposable local email<input className={control} type="email" pattern=".+@example\.invalid" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="off"/></label><label className="block">Disposable local password<input className={control} type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="off"/></label><button className={button} disabled={busy}>Sign in to local application</button></form>:<>
    <div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={()=>void run(refresh)}>Recheck saved content</button><button className={button} onClick={clear}>Clear local session</button></div>
    <h2 ref={heading} tabIndex={-1} className="font-display text-3xl">{tab.charAt(0).toUpperCase()+tab.slice(1)}</h2>
    <p role="status" aria-live="polite">{busy?"Checking local server authorization and content…":message}</p>
    {view&&!visible?<p role="status">Settings changed. Previous checks are hidden until the server revalidates them.</p>:null}
    {visible?.unavailable?<p role="alert">{visible.unavailable} saved records could not be verified under these restrictions. Content is preserved and withheld from checked recipes and shopping lists.</p>:null}
    <fieldset aria-busy={busy} className="min-w-0">
    {tab==="plan"?<form className="space-y-4 rounded-2xl bg-white p-4" onSubmit={e=>{e.preventDefault();void generate();}}>
      <p>{notice} <Link className="underline" href="/legal/safety">Complete dietary safety notice</Link></p>
      <fieldset><legend className="font-semibold">Explicit ingredient-source exclusions</legend><div className="grid grid-cols-2 gap-2">{["Milk","Eggs","Peanuts","Sesame"].map(a=><label key={a} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={selected.includes(a)} onChange={e=>setSelected(e.target.checked?[...selected,a]:selected.filter(v=>v!==a))}/>{a}</label>)}</div></fieldset>
      <p>Other allergies, intolerances, medical diets and unclear entries remain unsupported. Do not remove a genuine restriction to use this candidate.</p>
      <label className="block">Dietary preference<select className={control} value={preference} onChange={e=>setPreference(e.target.value)}><option value="">No preference</option><option>Vegetarian</option><option>Vegan</option></select></label>
      <label className="block">Ingredient avoidance<input className={control} value={avoid} onChange={e=>setAvoid(e.target.value)} maxLength={2000}/></label>
      <div className="grid gap-3 sm:grid-cols-3"><label>Illustrative budget<input className={control} type="number" min={1} max={10000} value={budget} onChange={e=>setBudget(Number(e.target.value))}/></label><label>Servings<input className={control} type="number" min={1} max={12} value={household} onChange={e=>setHousehold(Number(e.target.value))}/></label><label>Maximum estimated minutes<input className={control} type="number" min={5} max={180} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label></div>
      <fieldset><legend>Available equipment</legend>{["Oven","Stovetop"].map(e=><label key={e} className="mr-4 inline-flex min-h-11 items-center gap-2"><input type="checkbox" checked={equipment.includes(e)} onChange={v=>setEquipment(v.target.checked?[...equipment,e]:equipment.filter(a=>a!==e))}/>{e}</label>)}</fieldset>
      <label className="block">Pantry quantities (local engineering input)<textarea className={control} rows={3} placeholder={'[{"name":"Carrots","quantity":500,"unit":"g"}]'} value={pantry} onChange={e=>setPantry(e.target.value)}/></label>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={pantryOnly} onChange={e=>setPantryOnly(e.target.checked)}/>Use pantry only</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={dessert} onChange={e=>setDessert(e.target.checked)}/>Include one dessert candidate</label>
      <p>One completed seven-dinner plan uses one existing allowance: Free 5/week; Plus 20/week. Failure and reopening the same request use no additional allowance.</p>
      <button type="submit" disabled={busy} className={button}>Generate seven dinner candidates</button><button type="button" disabled={busy||pending.current?.key!==key} className="ml-3 min-h-11 underline" onClick={()=>void generate(true)}>Retry or reopen same request</button>
    </form>:null}
    {tab==="week"&&visible?<SmartCartWeekDashboard dinners={dinners} desserts={treats} cookedCount={cooked.owner===session.id?cooked.count:0} groceryCount={groceries.length} collectedCount={groceries.filter(i=>checked.has(i.foodId)).length} pantryCount={0} estimatedCost={money(cost)} budget={money(budget)} overBudget={cost>budget} hasIngredients hasOptions={visible.recipes.length>0} vaultCount={visible.vault.length} onNavigate={navigate}/>:null}
    {tab==="meals"&&visible?<>{visible.plan?<p className="mb-4 text-sm">{notice} {visible.plan.rotation.message}</p>:<p>Generate candidates in Plan.</p>}<SmartCartMealSections cuisinePreference="" expandedDetailCards={expanded} generatedPlan={{meals:generatedDinners,desserts:generatedDesserts}} householdSize={household} onArchiveMeal={archive} onReplaceMeal={(m,i)=>alternatives(m,i)} onReplaceDessert={m=>alternatives({...m,name:m.title},visible.recipes.findIndex(r=>r.name===m.title))} onSaveToWeeklyMenu={m=>void choose(m)} onToggleCardDetails={toggle} onToggleDessertSave={m=>void choose({...m,name:m.title})} replacingDessertKey={null} replacingMealKey={null} savedDessertKeys={new Set(treats.map(m=>m.name))} savedMealKeys={selectedMealKeys} userPlan={visible.featurePlan} userId={session.id} weeklyMenu={dinners}/></>:null}
    {tab==="cook"&&visible?<SmartCartCookSections {...guidance} expandedDetailCards={expanded} onArchiveMeal={archive} onGetRecipe={open} onRemoveFromWeeklyMenu={remove} onToggleCardDetails={toggle} onScheduleMeal={(m,d)=>void schedule(m,d)} recipeLoadingMeal={null} savedDesserts={treats} weeklyMenu={dinners}/>:null}
    {tab==="vault"&&visible?<SmartCartLibrarySections {...guidance} archivedMeals={visible.vault} cloudSyncMessage="Local disposable storage only" expandedDetailCards={expanded} formatCardEyebrow={d=>d} isSaving={busy} isVaultOpen={vaultOpen} isVaultLoading={false} vaultLoadError={null} onRetryVault={()=>run(refresh)} saveStatus="idle" onGetRecipe={open} onPermanentDelete={m=>run(async()=>{const recipe=resolve(m);if(!recipe.dbId)throw Error("Saved row unavailable.");await api({action:"delete-vault",id:recipe.dbId});await refresh();})} onRestoreMeal={choose} onSaveSession={()=>run(async()=>{await saveWeek(visible.week);await refresh();})} onToggleCardDetails={toggle} onToggleVaultOpen={()=>setVaultOpen(v=>!v)} onWaitlistEmailChange={()=>{}} onWaitlistSubmit={e=>{e.preventDefault();setMessage("External communications are disabled in this local runtime.");}} recipeLoadingMeal={null} userPlan={visible.featurePlan} userSignedIn vaultLimit={10} waitlistEmail="" waitlistStatus="idle"/>:null}
    {tab==="shop"&&visible?<><p>{visible.basketNotice}</p><p className="mt-2">{notice}</p><SmartCartGrocerySidebar {...guidance} onEnterStoreMode={()=>setMessage("Use collection checkboxes below. They do not change recipe requirements.")} undoMessage={null} onUndo={blockedEdit} budgetPercentage={Math.min(100,cost/budget*100)} budgetProgressBarClass="bg-pine" budgetStatusLabel="Illustrative cost" budgetStatusTextClass="text-pine" checkedItems={checked} copied={false} customItems={[]} displayGroceriesByCategory={[["Checked recipe requirements",groceries.map(i=>({category:"Recipe requirements",name:i.name,item_key:i.foodId,estimated_price:i.estimatedCost,needed_amount:`${i.quantity} ${i.unit}`,buy_amount:`${i.quantity} ${i.unit}`}))]]} formatCurrency={money} isGroceryOpen newCustomItem="" onAddCustomItem={blockedEdit} onChangeCustomItem={blockedEdit} onCopyShoppingList={()=>void run(async()=>{await api({action:"basket",entries:entries(visible.week),proposed:visible.basket});await navigator.clipboard.writeText(groceries.map(i=>`${i.quantity} ${i.unit} ${i.name}`).join("\n"));setMessage("Server-rechecked recipe requirements copied.");})} onRemoveCustomItem={blockedEdit} onRemoveGroceryItem={blockedEdit} onRemoveRestoredItem={blockedEdit} onRestoreSkippedItem={blockedEdit} onSetCustomItemChecked={blockedEdit} onToggleCheckedItem={value=>setChecked(old=>{const next=new Set(old);if(next.has(value))next.delete(value);else next.add(value);return next;})} onToggleGroceryOpen={()=>{}} parsedBudget={budget} restoredItems={[]} rawBudgetPercentage={cost/budget*100} skippedGroceriesByCategory={[]} totalCost={cost}/></>:null}
    </fieldset>
    <nav aria-label="MealCaddie sections" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-pine/20 bg-white p-1 shadow-lg">{(["week","plan","meals","shop","cook","vault"] as const).map(t=><button key={t} type="button" disabled={busy} aria-current={tab===t?"page":undefined} onClick={()=>navigate(t)} className={`min-h-14 rounded-xl px-1 text-xs font-semibold capitalize ${tab===t?"bg-pine text-white":"text-pine"}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</nav>
    </>}
    {!session?<p role="status" aria-live="polite">{busy?"Signing in locally…":message}</p>:null}
    <SmartCartRecipeModal diet={diet} activeRecipeMeal={activeMeal} activeRecipe={activeMeal?{title:activeMeal.name,prep_time_minutes:activeMeal.minutes,ingredients:activeMeal.ingredients.map(i=>`${i.amount} ${i.name}`),steps:activeMeal.steps}:undefined} onClose={()=>setActive(null)} recipeError={null} recipeLoadingMeal={null} userId={`local-library:${session?.id??""}:${activeMeal?.library.cacheKey??""}`} sourceNotice={notice} onCooked={activeMeal&&visible?.week.some(m=>m.library.cacheKey===activeMeal.library.cacheKey)?()=>void remove(activeMeal):undefined}/>
    <SmartCartDialog open={!!replace} title="Choose a checked replacement" onClose={()=>setReplace(null)}><p>{notice}</p>{replace?.choices.length?<ul className="mt-4 space-y-2">{replace.choices.map(r=><li key={r.id}><button className={button} disabled={busy} onClick={()=>void replaceWith(r.id)}>{r.name}</button></li>)}</ul>:<p role="status">No compatible replacement meets the original constraints. Keep genuine restrictions entered.</p>}</SmartCartDialog>
  </div></main>;
}
