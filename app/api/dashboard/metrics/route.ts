import {z} from "zod";
import {invoke,json,originOK,fail} from "@/lib/dashboard/server";
import {GBP,WEBSITE,period} from "@/lib/sama";
export const dynamic="force-dynamic";
export const maxDuration=120;
const input=z.object({source:z.enum(["google_my_business","searchconsole"]),days:z.union([z.literal(7),z.literal(28),z.literal(90)]),end:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()}).strict();
export async function POST(request:Request){
  if(!originOK(request))return json({status:"invalid_request",message:"طلب غير صالح."},403);
  try{
    const q=input.safeParse(await request.json());if(!q.success)return json({status:"invalid_request",message:"تحقق من الفترة."},400);
    const {source,days,end}=q.data;
    if(end&&(!Number.isFinite(Date.parse(end))||end>period().to||end<"2024-01-01"))return json({status:"invalid_request",message:"اختر تاريخًا مكتملًا قبل ثلاثة أيام على الأقل."},400);
    const p=period(days,end),account=source==="google_my_business"?GBP:WEBSITE;
    const fields=source==="google_my_business"?["date","call_clicks","direction_requests","impressions","website_clicks"]:["date","clicks","impressions","ctr","position"];
    const args={connector:source,accounts:[account],fields};
    const [current,previous]=await Promise.all([
      invoke("get_data",{...args,date_from:p.from,date_to:p.to}),
      invoke("get_data",{...args,date_from:p.previousFrom,date_to:p.previousTo})
    ]);
    return json({status:"success",current,previous,period:p,checkedAt:new Date().toISOString()});
  }catch(e){return fail(e);}
}
