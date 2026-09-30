import { get } from "@vercel/blob";
import { owner,database,json,fail } from "@/lib/dashboard/server";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, {params}: {params: Promise<{id:string}>}) {
  try {
    const uid=await owner(),{id}=await params;
    const asset=await database().prepare("SELECT url FROM assets WHERE id=? AND owner=?").bind(id,uid).first();
    if(!asset?.url)return json({status:"not_found"},404);
    const blob=await get(String(asset.url),{access:"private"});
    if(!blob||blob.statusCode!==200)return json({status:"not_found"},404);
    return new Response(blob.stream,{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(e){return fail(e);}
}
