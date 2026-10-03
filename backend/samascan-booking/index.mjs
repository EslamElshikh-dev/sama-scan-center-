const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

// Anonymous intake only. No read, booking confirmation, or CRM action is exposed.
export function createHandler(env, fetcher = fetch) {
  return async (request) => {
    if (request.method !== "POST") return reply({ ok: false, code: "method_not_allowed" }, 405);
    try {
      const keys = Object.values(JSON.parse(env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"));
      if (env.get("SUPABASE_ANON_KEY")) keys.push(env.get("SUPABASE_ANON_KEY"));
      if (!keys.includes(request.headers.get("apikey"))) return reply({ ok: false, code: "forbidden" }, 403);
      if (Number(request.headers.get("content-length")) > 6000) return reply({ ok: false, code: "invalid" }, 400);
      const raw = await request.text();
      if (raw.length > 6000) return reply({ ok: false, code: "invalid" }, 400);
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.company) return reply({ ok: false, code: "invalid" }, 400);
      const secretKeys = JSON.parse(env.get("SUPABASE_SECRET_KEYS") || "{}");
      const secret = secretKeys.default || env.get("SUPABASE_SERVICE_ROLE_KEY");
      const origin = env.get("SUPABASE_URL");
      if (!secret || !origin) return reply({ ok: false, code: "unavailable" }, 503);
      const upstreamHeaders = { "Content-Type": "application/json", apikey: secret };
      if (!secretKeys.default) upstreamHeaders.Authorization = `Bearer ${secret}`;
      const upstream = await fetcher(`${origin}/rest/v1/rpc/samascan_booking_intake`, {
        method: "POST", headers: upstreamHeaders, body: JSON.stringify({ payload }), signal: AbortSignal.timeout(12000),
      });
      if (!upstream.ok) return reply({ ok: false, code: "unavailable" }, 503);
      const result = await upstream.json();
      if (result?.ok === true && /^SS-[A-F0-9]{12}$/.test(result.reference)) return reply({ ok: true, reference: result.reference });
      if (result?.code === "rate_limit") return reply({ ok: false, code: "rate_limit" }, 429);
      if (result?.code === "invalid") return reply({ ok: false, code: "invalid" }, 400);
      return reply({ ok: false, code: "unavailable" }, 503);
    } catch {
      // Do not log patient data, request bodies, database errors or keys.
      return reply({ ok: false, code: "unavailable" }, 503);
    }
  };
}
if (globalThis.Deno) globalThis.Deno.serve(createHandler(globalThis.Deno.env));
