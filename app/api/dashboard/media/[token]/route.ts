import { get } from "@vercel/blob";
import { database,json } from "@/lib/dashboard/server";
export const dynamic = "force-dynamic";
// Only images explicitly approved for publication receive an unguessable public URL.
export async function GET(_request: Request, {params}: {params: Promise<{token:string}>}) {
  try {
    const {token}=await params;if(!/^[a-f0-9]{64}$/.test(token))return json({status:"not_found"},404);
    const asset=await database().prepare("SELECT url FROM assets WHERE public_token=?").bind(token).first();
    if(!asset?.url)return json({status:"not_found"},404);
    const blob=await get(String(asset.url),{access:"private"});
    if(!blob||blob.statusCode!==200)return json({status:"not_found"},404);
    return new Response(blob.stream,{headers:{"Content-Type":"image/jpeg","Cache-Control":"public, max-age=3600","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex"}});
  }catch{return json({status:"not_found"},404);}
}
