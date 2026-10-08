const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
export function createHandler(env, fetcher = fetch) {
  return async request => {
    if (request.method !== "POST") return reply({ ok: false, code: "method_not_allowed" }, 405);
    try {
      const keys = Object.values(JSON.parse(env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"));
      if (env.get("SUPABASE_ANON_KEY")) keys.push(env.get("SUPABASE_ANON_KEY"));
      if (!keys.includes(request.headers.get("apikey"))) return reply({ ok: false, code: "forbidden" }, 403);
      if (Number(request.headers.get("content-length")) > 3500) return reply({ ok: false, code: "invalid" }, 400);
      const raw = await request.text();
      if (raw.length > 3500) return reply({ ok: false, code: "invalid" }, 400);
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return reply({ ok: false, code: "invalid" }, 400);
      const secrets = JSON.parse(env.get("SUPABASE_SECRET_KEYS") || "{}");
      const secret = secrets.default || env.get("SUPABASE_SERVICE_ROLE_KEY");
      const origin = env.get("SUPABASE_URL");
      if (!secret || !origin) return reply({ ok: false, code: "unavailable" }, 503);
      const rpcHeaders = { "Content-Type": "application/json", apikey: secret };
      if (!secrets.default) rpcHeaders.Authorization = `Bearer ${secret}`;
      const upstream = await fetcher(`${origin}/rest/v1/rpc/samascan_contact_event_intake`, { method: "POST", headers: rpcHeaders,
        body: JSON.stringify({ payload }), signal: AbortSignal.timeout(8000) });
      if (!upstream.ok) return reply({ ok: false, code: "unavailable" }, 503);
      const result = await upstream.json();
      if (result?.ok === true) return reply({ ok: true });
      return reply({ ok: false, code: result?.code === "rate_limit" ? "rate_limit" : "invalid" }, result?.code === "rate_limit" ? 429 : 400);
    } catch { return reply({ ok: false, code: "unavailable" }, 503); }
  };
}
if (globalThis.Deno) globalThis.Deno.serve(createHandler(globalThis.Deno.env));
