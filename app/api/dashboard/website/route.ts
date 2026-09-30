import {invoke,json,originOK,owner,database,fail} from "@/lib/dashboard/server";
import {payload,period} from "@/lib/sama";
export const dynamic="force-dynamic";
export const maxDuration=120;
export async function POST(request:Request){if(!originOK(request))return json({status:"invalid_request"},403);try{
  const uid=await owner(),account=await database().prepare("SELECT account FROM links WHERE owner=? AND channel='googleanalytics4'").bind(uid).first();
  if(!account)return json({status:"not_connected",message:"اربط خاصية GA4 الخاصة بموقع المركز لقياس الزوار وضغطات واتساب."});
  const body=await request.json() as {days?:number};if(![7,28,90].includes(body.days??0))return json({status:"invalid_request"},400);
  const schema=await invoke("get_fields",{connector:"googleanalytics4"});if(schema.status!=="success")return json(schema);
  const p=payload(schema.result) as {result?:{id:string}[]};const fields=Array.isArray(p)?p:p.result??[];
  const pick=(ids:string[])=>fields.find(f=>ids.includes(f.id))?.id;
  const visitors=pick(["total_users","totalUsers"]),sessions=pick(["sessions"]),event=pick(["event_name","eventName"]),count=pick(["event_count","eventCount"]);
  if(!visitors||!sessions||!event||!count)return json({status:"tool_error",message:"تعذّر تحديد حقول GA4 المطلوبة. راجع إعداد المصدر."});
  const dates=period(body.days),args={connector:"googleanalytics4",accounts:[String(account.account)],date_from:dates.from,date_to:dates.to};
  const [traffic,events]=await Promise.all([invoke("get_data",{...args,fields:[visitors,sessions]}),invoke("get_data",{...args,fields:[event,count]})]);
  return json({status:"success",traffic,events,fields:{visitors,sessions,event,count},period:dates});
}catch(e){return fail(e);}}
