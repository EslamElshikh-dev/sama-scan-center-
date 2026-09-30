import {z} from "zod";
import {invoke,json,originOK,fail,owner,database} from "@/lib/dashboard/server";
import {channels,payload,GBP,WEBSITE} from "@/lib/sama";
type Account={id:string;name?:string};type Connector={id:string;accounts?:Account[];actions?:string[]};
export const dynamic="force-dynamic";
export const maxDuration=120;
const allowed=channels.map(c=>c.id);
export async function POST(request:Request){
  if(!originOK(request))return json({status:"invalid_request",message:"طلب غير صالح."},403);
  try{
    const q=z.object({operation:z.enum(["list","connect","select"]),channel:z.string().optional(),account:z.string().max(240).optional()}).strict().parse(await request.json());
    if(q.channel&&!allowed.includes(q.channel as typeof allowed[number]))return json({status:"invalid_request",message:"قناة غير مدعومة."},400);
    if(q.operation==="connect"){
      if(!q.channel)return json({status:"invalid_request",message:"اختر القناة."},400);
      const discovery=await invoke("get_connectors",{include_not_yet_connected:true,include_actions:false,include_options:false});
      if(discovery.status!=="success")return json(discovery);
      return json(await invoke("get_connector_authorization_url",{connector:q.channel}));
    }
    const r=await invoke("get_connectors",{include_actions:true,include_options:false});if(r.status!=="success")return json(r);
    const p=payload(r.result) as {result?:Connector[]};const list:Connector[]=Array.isArray(p)?p:p.result??[];
    if(q.operation==="select"){
      const uid=await owner();const match=list.find(c=>c.id===q.channel)?.accounts?.find(a=>a.id===q.account);
      if(!match||["google_my_business","searchconsole","snapchat"].includes(q.channel??""))return json({status:"invalid_request",message:"الحساب غير متاح للاختيار."},400);
      await database().prepare("INSERT INTO links (owner,channel,account,name) VALUES (?,?,?,?) ON CONFLICT(owner,channel) DO UPDATE SET account=excluded.account,name=excluded.name").bind(uid,q.channel,match.id,match.name??match.id).run();return json({status:"success"});
    }
    let saved:Record<string,unknown>[]=[];
    try{const uid=await owner();saved=(await database().prepare("SELECT channel,account,name FROM links WHERE owner=?").bind(uid).all()).results;}catch{}
    return json({status:"success",channels:channels.map(c=>{
      const conn=list.find(x=>x.id===c.id);const fixed=c.id==="google_my_business"?GBP:c.id==="searchconsole"?WEBSITE:null;
      const selection=saved.find(s=>s.channel===c.id);const selected=conn?.accounts?.find(a=>a.id===(fixed??selection?.account));
      return {...c,accounts:conn?.accounts??[],selected:selected??null,actions:conn?.actions??[]};
    })});
  }catch(e){return fail(e);}
}
