import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { allergyLabEnabled } from "./allergy-aware-planner";
import { buildAllergyPolicy, type RestrictionInput } from "./allergy-aware-policy";
import { LibraryError, type LocalSigningKeys } from "./allergy-library-provenance";

const localHosts=["localhost","127.0.0.1","[::1]"];
export function localLibraryEnabled(){return allergyLabEnabled()&&!process.env.VERCEL&&process.env.MEALCADDIE_ALLERGY_INTEGRATION==="true";}
export function localLibraryRequest(request:Request){
  if(!localLibraryEnabled()||!localHosts.includes(new URL(request.url).hostname))throw new LibraryError("NOT_FOUND",404,"Not found");
  const supplied=request.headers.get("origin");
  if(request.method!=="GET"&&!supplied)throw new LibraryError("ORIGIN",403,"Open the local lab to use this operation.");
  if(supplied){let origin:URL;try{origin=new URL(supplied);}catch{throw new LibraryError("ORIGIN",403,"Origin not allowed.");}
    const target=new URL(request.url);if(!localHosts.includes(origin.hostname)||origin.protocol!==target.protocol||origin.port!==target.port)throw new LibraryError("ORIGIN",403,"Origin not allowed.");}
}
export function localLibraryConfig(){
  if(!localLibraryEnabled())throw new LibraryError("NOT_FOUND",404,"Not found");
  const raw=process.env.MEALCADDIE_ALLERGY_LOCAL_SUPABASE_URL;
  let url:URL;try{url=new URL(raw??"");}catch{throw new LibraryError("LOCAL_CONFIG",503,"Configure the disposable local Supabase lab.");}
  if(!localHosts.includes(url.hostname)||url.protocol!=="http:"||url.pathname!=="/"||url.search||url.hash||url.username||url.password)throw new LibraryError("LOCAL_CONFIG",503,"Only a loopback disposable database is allowed.");
  const secret=process.env.MEALCADDIE_ALLERGY_LOCAL_SERVICE_KEY,publicKey=process.env.MEALCADDIE_ALLERGY_LOCAL_ANON_KEY;
  const signing=process.env.MEALCADDIE_ALLERGY_LOCAL_SIGNING_KEY;
  const ids=(process.env.MEALCADDIE_ALLERGY_LOCAL_USER_IDS??"").split(",").map(s=>s.trim()).filter(Boolean);
  if(!secret||!publicKey||!signing||Buffer.from(signing,"base64url").length<32||!ids.length||ids.some(id=>!z.string().uuid().safeParse(id).success))throw new LibraryError("LOCAL_CONFIG",503,"Local test credentials and an explicit synthetic-user allowlist are required.");
  // Configuration classification only, never user/session authorization. Prevent
  // an accidentally swapped service key from being returned as a public key.
  try{if(JSON.parse(Buffer.from(publicKey.split('.')[1],"base64url").toString()).role!=="anon"||JSON.parse(Buffer.from(secret.split('.')[1],"base64url").toString()).role!=="service_role")throw Error();}
  catch{throw new LibraryError("LOCAL_CONFIG",503,"Use the distinct local anon and service-role test credentials.");}
  let keys:LocalSigningKeys={active:"local-v1",keys:{"local-v1":signing}};
  // Optional disposable key ring: retain old verification keys during rotation;
  // remove a key to retire its artifacts. Never copy this material to hosting.
  if(process.env.MEALCADDIE_ALLERGY_LOCAL_KEY_RING){
    const schema=z.object({active:z.string().regex(/^[a-z0-9-]{1,40}$/),keys:z.record(z.string().regex(/^[A-Za-z0-9_-]+$/))}).strict();
    try{const parsed=schema.parse(JSON.parse(process.env.MEALCADDIE_ALLERGY_LOCAL_KEY_RING));
      if(Object.keys(parsed.keys).length>5||!parsed.keys[parsed.active]||Object.entries(parsed.keys).some(([kid,key])=>!/^[a-z0-9-]{1,40}$/.test(kid)||Buffer.from(key,"base64url").length<32))throw Error();keys=parsed;
    }catch{throw new LibraryError("LOCAL_CONFIG",503,"The local signing key ring is invalid.");}
  }
  return {url:url.origin,secret,publicKey,ids,keys};
}
export function localLibraryClients(token?:string){
  const config=localLibraryConfig();
  const options={auth:{autoRefreshToken:false,persistSession:false}};
  // Separate clients, never the cached shared-project admin client or its keys.
  return {config,admin:createClient(config.url,config.secret,options),user:createClient(config.url,config.publicKey,{...options,...(token?{global:{headers:{Authorization:`Bearer ${token}`}}}:{})})};
}
export function localLibraryBrowserConfigured(){
  // The ordinary layout imports the existing public SDK. A local app run must
  // point that SDK at the same disposable service as the dedicated adapter.
  // Use a clean browser profile; never inherit real-account localStorage.
  try{const config=localLibraryConfig();return process.env.NEXT_PUBLIC_SUPABASE_URL===config.url&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY===config.publicKey;}catch{return false;}
}
export function assertPilotScope(input:RestrictionInput){
  const policy=buildAllergyPolicy(input);
  if(policy.findings.length||!policy.allergies.length||policy.intolerances.length||policy.allergies.some(a=>!["Milk","Eggs","Peanuts","Sesame"].includes(a)))throw new LibraryError("SCOPE_UNSUPPORTED",422,"This candidate supports only explicit Milk, Eggs, Peanuts and Sesame exclusions. Keep other genuine restrictions entered; unsupported or unclear entries remain blocked.");
  return policy;
}
export async function authorizeLocalLibrary(admin:SupabaseClient,userId:string,allowlist:readonly string[]){
  if(!allowlist.includes(userId))throw new LibraryError("PILOT_REQUIRED",403,"This synthetic account is not enabled for the local exercise.");
  const verified=await admin.auth.admin.getUserById(userId);
  if(verified.error||!verified.data.user?.email_confirmed_at||verified.data.user.is_anonymous)throw new LibraryError("VERIFIED_REQUIRED",401,"A verified local account is required.");
  const access=await admin.rpc("beta_product_access",{p_user:userId});
  if(access.error)throw new LibraryError("ACCESS_UNAVAILABLE",503,"Local access verification is unavailable.");
  if(access.data?.allowed!==true)throw new LibraryError("ACCESS_REQUIRED",403,"Active or preserved product access and current applicable agreements are required.");
  const plan=await admin.rpc("beta_effective_plan",{p_user:userId});
  if(plan.error||!["free","plus"].includes(plan.data))throw new LibraryError("PLAN_UNAVAILABLE",503,"Local plan verification is unavailable.");
  return plan.data as "free"|"plus";
}
