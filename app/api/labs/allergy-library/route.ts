import { localLibraryClients, localLibraryConfig, localLibraryRequest } from "@/lib/allergy-library-local";
import { executeLibraryCommand } from "@/lib/allergy-library-service";
import { LibraryError } from "@/lib/allergy-library-provenance";

export const dynamic="force-dynamic";
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request){
  try{localLibraryRequest(request);const config=localLibraryConfig();return reply({url:config.url,anonKey:config.publicKey});}
  catch(error){return reply({error:error instanceof LibraryError?error.message:"Local configuration unavailable."},error instanceof LibraryError?error.status:503);}
}
export async function POST(request:Request){
  try{
    // Environment/loopback/origin gate precedes credentials, auth or DB access.
    localLibraryRequest(request);
    const token=/^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization")??"")?.[1];
    if(!token)return reply({error:"Sign in to the disposable local account.",code:"SIGN_IN"},401);
    const text=await request.text();if(text.length>40000)return reply({error:"Local request is too large."},413);
    let body:unknown;try{body=JSON.parse(text);}catch{return reply({error:"Use a valid local request."},400);}
    const {config,admin,user}=localLibraryClients(token);
    const verified=await admin.auth.getUser(token);
    if(verified.error||!verified.data.user?.email_confirmed_at||verified.data.user.is_anonymous)return reply({error:"Verified local account required."},401);
    return reply(await executeLibraryCommand(body,{admin,user,userId:verified.data.user.id,allowlist:config.ids,keys:config.keys}));
  }catch(error){
    if(error instanceof LibraryError)return reply({error:error.message,code:error.code},error.status);
    // Never log dietary text, saved data, signing material or backend error bodies.
    return reply({error:"The local library operation is unavailable. Existing content is preserved."},503);
  }
}
