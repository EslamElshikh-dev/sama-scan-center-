const responseHeaders = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: responseHeaders });
const referralActions = ["physician_options", "physician_list", "physician_detail", "physician_save", "visit_list", "visit_save", "physician_report"];

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
      if (Number(request.headers.get("content-length")) > 16384) return reply({ ok: false, code: "invalid_request" }, 400);
      const raw = await request.text();
      if (raw.length > 16384) return reply({ ok: false, code: "invalid_request" }, 400);
      const input = JSON.parse(raw);
      if (!input || !["booking_cost_report","booking_cost_save","contact_daily_report","contact_daily_save","contact_metrics","contact_record","summary", "list", "contact_detail","growth_list","growth_content_save","growth_maps_save","growth_gbp_save","growth_weekly","source_report", "conversion_queue", "link_appointment", "followup_context", "record_followup", "save", "save_user", ...referralActions].includes(input.action)) return reply({ ok: false, code: "invalid_request" }, 400);
      if (typeof input.token !== "string" || !/^[a-f0-9]{64}$/.test(input.token)) return reply({ ok: false, code: "credentials" }, 401);
      if (input.payload !== undefined && (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload))) return reply({ ok: false, code: "invalid" }, 400);
      const args = { action: input.action, session_token: input.token, payload: input.payload || {} };
      const secretKeys = JSON.parse(env.get("SUPABASE_SECRET_KEYS") || "{}");
      const secret = secretKeys.default || env.get("SUPABASE_SERVICE_ROLE_KEY");
      const origin = env.get("SUPABASE_URL");
      if (!secret || !origin) return reply({ ok: false, code: "unavailable" }, 503);
      const headers = { "Content-Type": "application/json", apikey: secret };
      if (!secretKeys.default) headers.Authorization = `Bearer ${secret}`;
      const rpc = ["booking_cost_report", "booking_cost_save"].includes(input.action) ? "samascan_booking_cost_api" : ["contact_daily_report", "contact_daily_save"].includes(input.action) ? "samascan_contact_daily_api" : ["contact_metrics", "contact_record"].includes(input.action) ? "samascan_contact_api" : input.action.startsWith("growth_") ? "samascan_growth_api" : referralActions.includes(input.action) ? "samascan_referral_api" : input.action === "source_report" ? "samascan_outcome_report" : ["followup_context", "record_followup"].includes(input.action) ? "samascan_followup_api" : ["conversion_queue", "link_appointment"].includes(input.action) ? "samascan_conversion_api" : "samascan_crm_api";
      const upstream = await fetcher(`${origin}/rest/v1/rpc/${rpc}`, {
        method: "POST", headers, body: JSON.stringify(args), signal: AbortSignal.timeout(12000),
      });
      if (!upstream.ok) return reply({ ok: false, code: "unavailable" }, 503);
      const result = await upstream.json();
      if (result?.ok === true) return reply(result);
      const statuses = { credentials: 401, forbidden: 403, conflict: 409, overlap: 409, duplicate: 409, not_found: 404, invalid: 400, own_account: 400, password: 400, linked_booking: 409, use_booking: 400, next_required: 400, followup_exists: 409, followup_time: 400 };
      if (Object.hasOwn(statuses, result?.code)) return reply({ ok: false, code: result.code }, statuses[result.code]);
      return reply({ ok: false, code: "unavailable" }, 503);
    } catch {
      // Never log credential-bearing bodies, tokens, or database errors.
      return reply({ ok: false, code: "unavailable" }, 503);
    }
  };
}
const runtime = globalThis.Deno;
if (runtime) runtime.serve(createHandler(runtime.env));
