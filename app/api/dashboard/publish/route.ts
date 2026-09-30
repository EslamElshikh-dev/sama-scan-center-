import {randomBytes} from "node:crypto";
import {APP_ORIGIN} from "@/lib/dashboard/auth";
import {z} from "zod";
import type {Json} from "@/lib/dashboard/types";
import {invoke,json,originOK,owner,database,fail} from "@/lib/dashboard/server";
import {payload,GBP,WEBSITE} from "@/lib/sama";
export const dynamic="force-dynamic";
export const maxDuration=300;
type Connector={id:string;accounts?:{id:string}[];actions?:string[]};
export async function POST(request:Request){
  if(!originOK(request))return json({status:"invalid_request"},403);
  try{
    const uid=await owner(),{id}=z.object({id:z.string().uuid(),confirmed:z.literal(true)}).strict().parse(await request.json()),db=database();
    const post=await db.prepare("SELECT * FROM posts WHERE id=? AND owner=?").bind(id,uid).first();
    if(!post)return json({status:"invalid_request",message:"المسودة غير موجودة."},404);
    if(post.status!=="draft")return json({status:"invalid_request",message:"سُجل إرسال هذا المنشور سابقًا. راجع سجل النتائج قبل أي محاولة أخرى."},409);
    const selected=JSON.parse(String(post.channels)) as string[];
    if(!selected.length)return json({status:"invalid_request",message:"اختر قناة واحدة على الأقل."},400);
    let publicationToken: string | null = null;
    if(post.asset){
      const asset=await db.prepare("SELECT id,public_token FROM assets WHERE id=? AND owner=?").bind(post.asset,uid).first();
      if(!asset)return json({status:"invalid_request",message:"الصورة غير متاحة."},400);
      publicationToken=typeof asset.public_token==="string"?asset.public_token:randomBytes(32).toString("hex");
      post.image_url=`${APP_ORIGIN}/api/dashboard/media/${publicationToken}`;
    }
    if(selected.includes("instagram")&&!post.image_url)return json({status:"invalid_request",message:"إنستغرام يحتاج إلى صورة JPEG."},400);
    const discovery=await invoke("get_connectors",{include_actions:true,include_options:false});
    if(discovery.status!=="success")return json(discovery);
    const value=payload(discovery.result) as {result?:Connector[]};const connected:Connector[]=Array.isArray(value)?value:value.result??[];
    const saved=(await db.prepare("SELECT channel,account FROM links WHERE owner=?").bind(uid).all()).results;
    const jobs:{channel:string;account:string;action:string;params:Record<string,Json>}[]=[];
    for(const channel of selected){
      const account=channel==="google_my_business"?GBP:String(saved.find(l=>l.channel===channel)?.account??"");
      const action=channel==="google_my_business"?"create_local_post":channel==="instagram"?"create_image_post":post.image_url?"create_photo_post":"create_post";
      const conn=connected.find(c=>c.id===channel);
      if(!conn?.accounts?.some(a=>a.id===account)||!conn.actions?.includes(action))return json({status:"invalid_request",message:"اربط كل القنوات المختارة بحساب المركز أولًا."},400);
      const params:Record<string,Json>=channel==="google_my_business"?{summary:String(post.body),language_code:"ar",...(post.image_url?{photo_url:String(post.image_url)}:{}),...(post.cta!=="NONE"?{cta_type:String(post.cta),...(post.cta==="LEARN_MORE"?{cta_url:WEBSITE}:{} )}:{})}:channel==="instagram"?{caption:String(post.body),image_url:String(post.image_url)}:post.image_url?{caption:String(post.body),image_url:String(post.image_url)}:{message:String(post.body)};
      jobs.push({channel,account,action,params});
    }
    const locked=await db.prepare("UPDATE posts SET status='publishing',updated=? WHERE id=? AND owner=? AND status='draft'").bind(Date.now(),id,uid).run();
    if(locked.meta.changes!==1)return json({status:"invalid_request",message:"الإرسال قيد التنفيذ بالفعل."},409);
    if(publicationToken)await db.prepare("UPDATE assets SET public_token=? WHERE id=? AND owner=?").bind(publicationToken,post.asset,uid).run();
    const results=[];
    for(const job of jobs){
      await db.prepare("INSERT INTO deliveries(post,channel,status,updated) VALUES(?,?,'sending',?)").bind(id,job.channel,Date.now()).run();
      const result=await invoke("execute_action",{connector:job.channel,account:job.account,action:job.action,params:job.params});
      const status=result.status==="success"?"sent":["upstream_error","internal_error"].includes(result.status)?"uncertain":"failed";
      await db.prepare("UPDATE deliveries SET status=?,result=?,updated=? WHERE post=? AND channel=?").bind(status,JSON.stringify(result),Date.now(),id,job.channel).run();results.push({channel:job.channel,status,result});
    }
    const allOK=results.every(r=>r.status==="sent");
    await db.prepare("UPDATE posts SET status=?,updated=? WHERE id=? AND owner=?").bind(allOK?"sent":"review",Date.now(),id,uid).run();
    return json({status:"success",allOK,deliveries:results});
  }catch(e){return fail(e);}
}
