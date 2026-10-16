import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { catalogVersion, foodCatalog, homemadeComponents } from "./allergy-aware-catalog";
import { allergyPlanInputSchema, type ReviewedPlan } from "./allergy-aware-planner";
import { recipeById } from "./allergy-aware-recipes";

export type LocalSigningKeys = { active:string; keys:Readonly<Record<string,string>> };
const payloadSchema=z.object({
  v:z.literal(1),aud:z.literal("local-allergy-library"),owner:z.string().uuid(),artifact:z.string().uuid(),job:z.string().uuid(),
  catalog:z.literal(catalogVersion),catalogDigest:z.string().regex(/^[a-f0-9]{64}$/),input:allergyPlanInputSchema,
  recipes:z.array(z.object({id:z.string().max(80),revision:z.number().int().positive(),digest:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).min(1).max(8),
}).strict();
export type LibraryPayload = z.infer<typeof payloadSchema>;
export class LibraryError extends Error {
  constructor(public code:string,public status:number,message:string){super(message);}
}
export function canonical(value:unknown):string {
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string,unknown>).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}
const digest=(value:unknown)=>createHash("sha256").update(canonical(value)).digest("hex");
function keyFor(keys:LocalSigningKeys,kid:string){
  const raw=keys.keys[kid];
  if(!/^[a-z0-9-]{1,40}$/.test(kid)||!raw||!/^[A-Za-z0-9_-]+$/.test(raw)||Buffer.from(raw,"base64url").length<32)throw new LibraryError("PROVENANCE_KEY",503,"Local signing configuration is unavailable.");
  return Buffer.from(raw,"base64url");
}
export function signLibraryPlan(plan:ReviewedPlan,owner:string,artifact:string,job:string,keys:LocalSigningKeys) {
  const input=JSON.parse(JSON.stringify(plan.snapshot.input));
  const payload=payloadSchema.parse({v:1,aud:"local-allergy-library",owner,artifact,job,catalog:catalogVersion,catalogDigest:digest([foodCatalog,homemadeComponents]),input,
    recipes:plan.recipeIds.map(id=>{const recipe=recipeById(id);if(!recipe)throw new LibraryError("RECIPE_UNKNOWN",422,"Recipe is no longer in the candidate catalog.");return {id,revision:recipe.revision,digest:digest(recipe)};})});
  const body=Buffer.from(canonical(payload)).toString("base64url"),kid=keys.active;
  const signature=createHmac("sha256",keyFor(keys,kid)).update(`v1.${kid}.${body}`).digest("base64url");
  const token=`v1.${kid}.${body}.${signature}`;
  if(token.length>20000)throw new LibraryError("PROVENANCE_SIZE",422,"This private recipe snapshot is too large. Reduce the pantry entry size; keep genuine restrictions entered. No allowance was consumed.");
  return token;
}
export function verifyLibraryPlan(token:unknown,owner:string,keys:LocalSigningKeys):LibraryPayload {
  const fail=()=>new LibraryError("PROVENANCE_INVALID",422,"Saved content is preserved, but its ingredient-source check cannot be verified. Start a new checked plan.");
  if(typeof token!=="string"||token.length>20000)throw fail();
  const pieces=token.split(".");if(pieces.length!==4||pieces[0]!=="v1"||!pieces.slice(2).every(s=>/^[A-Za-z0-9_-]+$/.test(s)))throw fail();
  const [,kid,body,signature]=pieces;
  let key:Buffer;try{key=keyFor(keys,kid);}catch{throw fail();}
  const expected=createHmac("sha256",key).update(`v1.${kid}.${body}`).digest(),actual=Buffer.from(signature,"base64url");
  if(actual.toString("base64url")!==signature||actual.length!==expected.length||!timingSafeEqual(expected,actual))throw fail();
  let parsed;try{parsed=payloadSchema.safeParse(JSON.parse(Buffer.from(body,"base64url").toString("utf8")));}catch{throw fail();}
  if(!parsed.success||parsed.data.owner!==owner)throw fail();
  const payload=parsed.data;
  if(payload.catalogDigest!==digest([foodCatalog,homemadeComponents]))throw fail();
  if(!payload.input.selectedRecipeIds||canonical(payload.recipes.map(r=>r.id))!==canonical(payload.input.selectedRecipeIds)||new Set(payload.recipes.map(r=>r.id)).size!==payload.recipes.length)throw fail();
  for(const record of payload.recipes){const recipe=recipeById(record.id);if(!recipe||recipe.revision!==record.revision||digest(recipe)!==record.digest)throw fail();}
  return payload;
}
// Integrity evidence only: no medical, manufacturer or professional validation.
// No token is an access credential. Every operation must reauthorize its owner.
