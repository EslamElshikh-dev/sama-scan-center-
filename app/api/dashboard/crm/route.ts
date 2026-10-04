import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/dashboard/auth";
import { headers, originOK } from "@/lib/dashboard/server";
export const dynamic = "force-dynamic";
const URL = "https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/samascan-crm";
const KEY = "sb_publishable_ZpjxAzWkEPl2jfJg17iRVg_XYdIs2pO";
const reply = (code:string,status:number) => Response.json({ok:false,code},{status,headers});
export async function POST(request:Request) {
 if(!originOK(request))return reply("forbidden",403);
 const token=(await cookies()).get(ADMIN_COOKIE)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token))return reply("credentials",401);
 if(Number(request.headers.get("content-length"))>15000)return reply("invalid",400);
 try {
  const raw=await request.text(); if(raw.length>15000)return reply("invalid",400);
  let body; try {body=JSON.parse(raw);}catch{return reply("invalid",400);}
  if(!body||!["summary","list","contact_detail","source_report","conversion_queue","link_appointment","save","save_user","physician_options","physician_list","physician_detail","physician_save","visit_list","visit_save","physician_report"].includes(body.action))return reply("invalid",400);
  const upstream=await fetch(URL,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({action:body.action,payload:body.payload,token}),signal:AbortSignal.timeout(15000)});
  if(![200,400,401,403,404,409].includes(upstream.status))return reply("unavailable",503);
  return Response.json(await upstream.json(),{status:upstream.status,headers});
 }catch{return reply("unavailable",503);}
}
