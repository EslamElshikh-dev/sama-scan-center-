import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { json, originOK, owner, database, fail } from "@/lib/dashboard/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!originOK(request)) return json({ status: "invalid_request" }, 403);
  try {
    const uid = await owner(), db = database();
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("STORAGE_UNAVAILABLE");
    if (Number(request.headers.get("content-length")) > 4400000) return json({ status: "invalid_request", message: "الحد الأقصى 4 ميجابايت." }, 413);
    const f = (await request.formData()).get("file");
    if (!(f instanceof File) || f.size < 10000 || f.size > 4*1024*1024 || !["image/jpeg","image/png"].includes(f.type)) return json({ status: "invalid_request", message: "ارفع JPG أو PNG بين 10 كيلوبايت و4 ميجابايت." }, 400);
    const image = sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 20000000 });
    const metadata = await image.metadata();
    if (!["jpeg","png"].includes(metadata.format || "") || (metadata.width || 0) < 250 || (metadata.height || 0) < 250) return json({ status: "invalid_request", message: "الصورة يجب ألا تقل عن 250 × 250 بكسل." }, 400);
    const bytes = await image.rotate().resize({ width: 1440, height: 1440, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    const id = crypto.randomUUID();
    const blob = await put(`samascan/${id}.jpg`, bytes, { access: "private", contentType: "image/jpeg", addRandomSuffix: true });
    try { await db.prepare("INSERT INTO assets(id,owner,name,type,size,created,url) VALUES(?,?,?,?,?,?,?)").bind(id,uid,f.name.slice(0,150),"image/jpeg",bytes.length,Date.now(),blob.url).run(); }
    catch (e) { await del(blob.url); throw e; }
    return json({ status: "success", id, name: f.name });
  } catch (e) { return fail(e); }
}
