import { NextResponse } from "next/server";
import { allergyLabEnabled, createAllergyAwarePlan } from "@/lib/allergy-aware-planner";
import { auditAllergyDraft } from "@/lib/allergy-aware-policy";

export async function POST(request:Request) {
  const url=new URL(request.url);
  const localHosts=["localhost","127.0.0.1","[::1]"];
  if(!allergyLabEnabled()||!localHosts.includes(url.hostname))return NextResponse.json({error:"Not found"},{status:404});
  // Next dev may canonicalize a 127.0.0.1 request to localhost. Accept only
  // loopback aliases on the same protocol/port, never an external Origin.
  const suppliedOrigin=request.headers.get("origin");
  if(suppliedOrigin){
    let origin:URL;try{origin=new URL(suppliedOrigin);}catch{return NextResponse.json({error:"Origin not allowed"},{status:403});}
    if(!localHosts.includes(origin.hostname)||origin.protocol!==url.protocol||origin.port!==url.port)return NextResponse.json({error:"Origin not allowed"},{status:403});
  }
  const body=await request.text();
  if(body.length>20000)return NextResponse.json({error:"Local example is too large"},{status:413});
  let input:unknown;try{input=JSON.parse(body);}catch{return NextResponse.json({error:"Use a JSON example"},{status:400});}
  if(input&&typeof input==="object"&&"draft" in input&&"diet" in input){
    const i=input as {draft:unknown;diet:unknown};
    if(typeof i.diet!=="string"||i.diet.length>6000)return NextResponse.json({error:"Review the dietary entry"},{status:400});
    return NextResponse.json(auditAllergyDraft(i.draft,{diet:i.diet}),{headers:{"Cache-Control":"no-store"}});
  }
  const result=createAllergyAwarePlan(input);
  return NextResponse.json(result,{status:result.ok?200:422,headers:{"Cache-Control":"no-store"}});
}
