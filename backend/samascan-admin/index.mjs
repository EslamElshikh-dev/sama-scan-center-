const responseHeaders = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: responseHeaders });

// Credentials/session tokens authorize the administrator. The database key
// remains in Supabase's private environment; project publishable keys are public.
export function createHandler(env, fetcher = fetch) {
  return async (request) => {
    if (request.method !== "POST") return reply({ ok: false, code: "method_not_allowed" }, 405);
    try {
      const publishable = Object.values(JSON.parse(env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"));
      const anon = env.get("SUPABASE_ANON_KEY");
      if (anon) publishable.push(anon);
      if (!publishable.includes(request.headers.get("apikey"))) return reply({ ok: false, code: "credentials" }, 401);
      if (Number(request.headers.get("content-length")) > 2048) return reply({ ok: false, code: "invalid_request" }, 400);
      const raw = await request.text();
      if (raw.length > 2048) return reply({ ok: false, code: "invalid_request" }, 400);
      const input = JSON.parse(raw);
      if (!input || !["login", "verify", "logout"].includes(input.action)) return reply({ ok: false, code: "invalid_request" }, 400);
      const args = { action: input.action };
      if (input.action === "login") {
        if (typeof input.username !== "string" || input.username.length > 64 || typeof input.password !== "string" || input.password.length > 256) return reply({ ok: false, code: "credentials" }, 401);
        args.candidate_username = input.username;
        args.candidate_password = input.password;
      } else {
        if (typeof input.token !== "string" || !/^[a-f0-9]{64}$/.test(input.token)) return reply({ ok: false, code: "credentials" }, 401);
        args.session_token = input.token;
      }
      const secretKeys = JSON.parse(env.get("SUPABASE_SECRET_KEYS") || "{}");
      const secret = secretKeys.default || env.get("SUPABASE_SERVICE_ROLE_KEY");
      const origin = env.get("SUPABASE_URL");
      if (!secret || !origin) return reply({ ok: false, code: "unavailable" }, 503);
      const headers = { "Content-Type": "application/json", apikey: secret };
      if (!secretKeys.default) headers.Authorization = `Bearer ${secret}`;
      const upstream = await fetcher(`${origin}/rest/v1/rpc/samascan_admin_auth`, {
        method: "POST", headers, body: JSON.stringify(args), signal: AbortSignal.timeout(8000),
      });
      if (!upstream.ok) return reply({ ok: false, code: "unavailable" }, 503);
      const result = await upstream.json();
      if (result?.ok === true) return reply(result);
      if (result?.code === "rate_limit") return reply({ ok: false, code: "rate_limit" }, 429);
      if (result?.code === "credentials") return reply({ ok: false, code: "credentials" }, 401);
      return reply({ ok: false, code: "unavailable" }, 503);
    } catch {
      // Never log credential-bearing bodies, tokens, or database errors.
      return reply({ ok: false, code: "unavailable" }, 503);
    }
  };
}
const runtime = globalThis.Deno;
if (runtime) runtime.serve(createHandler(runtime.env));
