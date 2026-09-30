import {z} from "zod";
import {json,originOK,owner,database,fail} from "@/lib/dashboard/server";
export const dynamic="force-dynamic";
export async function GET(){try{
  const uid=await owner(),db=database();const [posts,tasks,deliveries]=await Promise.all([
    db.prepare("SELECT * FROM posts WHERE owner=? ORDER BY updated DESC LIMIT 60").bind(uid).all(),
    db.prepare("SELECT key,done FROM improvements WHERE owner=?").bind(uid).all(),
    db.prepare("SELECT d.* FROM deliveries d JOIN posts p ON p.id=d.post WHERE p.owner=? ORDER BY d.updated DESC LIMIT 120").bind(uid).all()
  ]);return json({status:"success",posts:posts.results,tasks:tasks.results,deliveries:deliveries.results});
}catch(e){return fail(e);}}
export async function POST(request:Request){if(!originOK(request))return json({status:"invalid_request"},403);try{
  const uid=await owner(),raw=await request.json() as Record<string,unknown>,db=database();
  if(raw.operation==="task"){
    const q=z.object({operation:z.literal("task"),key:z.enum(["calls","landing","search","content","ga4"]),done:z.boolean()}).strict().parse(raw);
    await db.prepare("INSERT INTO improvements (owner,key,done) VALUES (?,?,?) ON CONFLICT(owner,key) DO UPDATE SET done=excluded.done").bind(uid,q.key,q.done?1:0).run();return json({status:"success"});
  }
  const q=z.object({operation:z.literal("save"),id:z.string().uuid(),body:z.string().trim().min(1).max(1500),channels:z.array(z.enum(["google_my_business","facebook_organic","instagram"])).max(3),asset:z.string().uuid().nullable(),imageUrl:z.string().max(2083).nullable(),cta:z.enum(["CALL","LEARN_MORE","NONE"])}).strict().parse(raw);
  if(q.imageUrl){const u=new URL(q.imageUrl);if(u.protocol!=="https:"||u.username||u.password||u.hostname==="localhost"||/^\d/.test(u.hostname))return json({status:"invalid_request",message:"استخدم رابط صورة عام يبدأ بـ https."},400);}
  if(q.asset&&!await db.prepare("SELECT id FROM assets WHERE id=? AND owner=?").bind(q.asset,uid).first())return json({status:"invalid_request",message:"الصورة غير متاحة."},400);
  const existing=await db.prepare("SELECT id,status,owner FROM posts WHERE id=?").bind(q.id).first();
  if(existing&&(existing.owner!==uid||existing.status!=="draft"))return json({status:"invalid_request",message:"هذا المنشور أُرسل سابقًا. أنشئ مسودة جديدة."},409);
  const now=Date.now();await db.prepare("INSERT INTO posts(id,owner,body,channels,asset,image_url,cta,status,created,updated) VALUES(?,?,?,?,?,?,?,'draft',?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,channels=excluded.channels,asset=excluded.asset,image_url=excluded.image_url,cta=excluded.cta,updated=excluded.updated WHERE posts.owner=excluded.owner AND posts.status='draft'").bind(q.id,uid,q.body,JSON.stringify([...new Set(q.channels)]),q.asset,q.imageUrl,q.cta,now,now).run();
  return json({status:"success",id:q.id});
}catch(e){return fail(e);}}
