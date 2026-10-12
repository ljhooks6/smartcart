import { requireBetaAdmin, betaJson } from "@/lib/beta-server";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
 const access=await requireBetaAdmin(request);if("response" in access)return access.response;
 const pageText=new URL(request.url).searchParams.get("page")??"1";
 if(!/^[1-9]\d{0,3}$/.test(pageText))return betaJson({error:"Invalid page."},400);
 const page=Number(pageText),start=(page-1)*50;
 const result=await access.client.from("beta_privacy_requests").select("user_id,kind,state,created_at,request_key",{count:"exact"}).order("created_at",{ascending:false}).order("request_key").range(start,start+49);
 if(result.error)return betaJson({error:"Privacy request storage awaits reviewed migration or is unavailable."},503);
 return betaJson({requests:result.data,page,total:result.count,pageSize:50});
}
