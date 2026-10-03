import { z } from "zod";
import { originOK } from "@/lib/dashboard/server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const reply = (code: string, status: number) => Response.json({ ok: false, code }, { status, headers });
const schema = z.object({
  request_id: z.string().uuid(), name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(25),
  exam: z.enum(["رنين مغناطيسي", "سونار", "دوبلر", "سونار 3D / 4D"]),
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requested_period: z.enum(["morning", "afternoon", "evening"]),
  consent: z.literal(true), company: z.string().max(0).optional(),
  attribution: z.object({
    channel: z.enum(["google_business_profile", "google_ads", "google_organic", "social", "referral", "campaign", "direct"]),
    source: z.string().max(128), medium: z.string().max(128), campaign: z.string().max(128),
    content: z.string().max(128), landingPage: z.string().max(200), referrerHost: z.string().max(200),
  }),
});

export async function POST(request: Request) {
  if (!originOK(request)) return reply("forbidden", 403);
  if (Number(request.headers.get("content-length")) > 6000) return reply("invalid", 400);
  try {
    const raw = await request.text();
    if (raw.length > 6000) return reply("invalid", 400);
    const input = schema.safeParse(JSON.parse(raw));
    if (!input.success) return reply("invalid", 400);
    const response = await fetch("https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/samascan-booking", {
      method: "POST", cache: "no-store", headers: {
        "Content-Type": "application/json", apikey: "sb_publishable_ZpjxAzWkEPl2jfJg17iRVg_XYdIs2pO",
      }, body: JSON.stringify(input.data), signal: AbortSignal.timeout(15000),
    });
    if (![200, 400, 429].includes(response.status)) return reply("unavailable", 503);
    const result = await response.json();
    if (response.ok && result.ok === true && /^SS-[A-F0-9]{12}$/.test(result.reference)) {
      return Response.json({ ok: true, reference: result.reference }, { headers });
    }
    return reply(result.code === "rate_limit" ? "rate_limit" : "invalid", response.status === 429 ? 429 : 400);
  } catch { return reply("unavailable", 503); }
}
