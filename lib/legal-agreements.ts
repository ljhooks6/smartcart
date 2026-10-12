import { betaStorageClient, betaJson, boundedJson } from "./beta-server";
import {legalVersion} from "./legal-documents";
import { productGateEnabled } from "./product-access";
import { sameOrigin } from "./beta-onboarding-domain";
export function legalGateEnabled() {return process.env.LEGAL_LANGUAGE_APPROVED==="true" && process.env.LEGAL_STORAGE_APPROVED==="true" && process.env.LEGAL_GATE_ENABLED==="true";}
export async function agreementsForUser(userId: string | null) {
 if(productGateEnabled())return true; // Current product eligibility already accounts for fresh participant agreements, while preserving legacy users.
 return currentAgreementsRecorded(userId);
}
export async function currentAgreementsRecorded(userId: string | null) {
 if(!legalGateEnabled())return true;if(!userId)return false;
 const result=await betaStorageClient().from("legal_agreements").select("terms_version,safety_version,privacy_version,beta_version").eq("user_id",userId).eq("terms_version",legalVersion).eq("safety_version",legalVersion).eq("privacy_version",legalVersion).eq("beta_version",legalVersion).maybeSingle();
 return !result.error&&!!result.data;
}
export async function requireAgreements(request: Request) {
 if(productGateEnabled())return null; // Existing users are preserved by the product gate; fresh beta acceptance checks current agreements separately.
 if(!legalGateEnabled())return null;
 const token=/^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization")??"")?.[1];if(!token)return betaJson({error:"Review the current agreements before creating new AI content.",reviewUrl:"/legal/review"},428);
 const result=await betaStorageClient().auth.getUser(token);
 if(result.error||!result.data.user?.email_confirmed_at||result.data.user.is_anonymous)return betaJson({error:"A verified account is required."},401);
 return await agreementsForUser(result.data.user.id)?null:betaJson({error:"Review the current agreements before creating new AI content.",reviewUrl:"/legal/review"},428);
}
export async function recordAgreements(request: Request) {
 if(!legalGateEnabled())return betaJson({error:"Draft acceptance recording is disabled pending legal, migration and rollout approval."},403);
 if(!request.headers.get("origin")||!sameOrigin(request))return betaJson({error:"Invalid origin."},403);
 const token=/^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization")??"")?.[1];
 if(!token)return betaJson({error:"Sign in to review agreements."},401);
 const client=betaStorageClient();const identity=await client.auth.getUser(token);
 if(identity.error||!identity.data.user?.email_confirmed_at||identity.data.user.is_anonymous)return betaJson({error:"Verified account required."},401);
 let body;try{body=await boundedJson(request);}catch{return betaJson({error:"Invalid request."},400);}
 if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).sort().join(",")!=="beta,betaVersion,privacy,privacyVersion,safety,safetyVersion,terms,termsVersion")return betaJson({error:"Explicit agreement confirmation required."},400);
 const data=body as Record<string,unknown>;
 if(["terms","privacy","safety","beta"].some(key=>data[key]!==true||data[key+"Version"]!==legalVersion))return betaJson({error:"Review and affirm all current documents. Marketing and analytics remain separate."},400);
 const saved=await client.from("legal_agreements").upsert({user_id:identity.data.user.id,terms_version:legalVersion,safety_version:legalVersion,privacy_version:legalVersion,beta_version:legalVersion,terms_accepted:true,privacy_acknowledged:true,safety_acknowledged:true,beta_accepted:true},{onConflict:"user_id,terms_version,privacy_version,safety_version,beta_version",ignoreDuplicates:true});
 return saved.error?betaJson({error:"We could not record your agreements. Try again."},503):betaJson({saved:true});
}
