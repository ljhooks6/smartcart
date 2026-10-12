import {NextResponse} from "next/server";
import {z} from "zod";
const input=z.object({ingredients:z.array(z.string().min(1)).min(1)});
export async function POST(request:Request) {
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"Request body must be valid JSON."},{status:400});}
 if(!input.safeParse(body).success)return NextResponse.json({error:"Missing required field: ingredients"},{status:400});
 // This legacy endpoint lacks trustworthy restriction/source context. The app
 // already uses deterministic grocery grouping, which remains unchanged.
 return NextResponse.json({error:"AI ingredient rewriting is temporarily unavailable. Keep original ingredient names and use the existing MealCaddie shopping list.",code:"FOOD_TRANSFORMATION_RESTRICTED"},{status:422});
}
