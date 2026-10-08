import { z } from "zod";
import { originOK } from "@/lib/dashboard/server";
export const dynamic = "force-dynamic";
const gateway = "https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/samascan-contact-events";
const key = "sb_publishable_ZpjxAzWkEPl2jfJg17iRVg_XYdIs2pO";
const attribution = z.object({
  channel: z.enum(["google_business_profile", "google_ads", "google_organic", "social", "referral", "campaign", "direct"]),
  source: z.string().max(128), medium: z.string().max(128), campaign: z.string().max(128), content: z.string().max(128),
  landingPage: z.string().max(200), referrerHost: z.string().max(200),
});
const schema = z.object({ event_id: z.string().uuid(), session_id: z.string().uuid(), kind: z.enum(["phone", "whatsapp"]),
  cta: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), page_path: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).max(200), attribution });
const reply = (code: string, status: number) => Response.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!originOK(request)) return reply("forbidden", 403);
  if (Number(request.headers.get("content-length")) > 3500) return reply("invalid", 400);
  try {
    const raw = await request.text();
    if (raw.length > 3500) return reply("invalid", 400);
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return reply("invalid", 400);
    const response = await fetch(gateway, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data), cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return reply(response.status === 429 ? "rate_limit" : "unavailable", response.status === 429 ? 429 : 503);
    const result = await response.json();
    if (result.ok !== true) return reply("unavailable", 503);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return reply("unavailable", 503); }
}
