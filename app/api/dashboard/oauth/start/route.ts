import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { APP_ORIGIN, CALLBACK, CLIENT_ID, STATE_COOKIE, cookieOptions, requireAdmin } from "@/lib/dashboard/auth";
import { readAdminConfig } from "@/lib/dashboard/session";
export async function GET(request: Request) {
  if (new URL(request.url).origin !== APP_ORIGIN) return Response.redirect(`${APP_ORIGIN}/dashboard`, 303);
  if (readAdminConfig()) { try { await requireAdmin(); } catch { return Response.redirect(`${APP_ORIGIN}/dashboard`, 303); } }
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  (await cookies()).set(STATE_COOKIE, JSON.stringify({ state, verifier, expires: Date.now() + 600000 }), { ...cookieOptions, maxAge: 600 });
  const url = new URL("https://mcp.windsor.ai/authorize");
  for (const [key, value] of Object.entries({ client_id: CLIENT_ID, redirect_uri: CALLBACK, response_type: "code", scope: "create", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", resource: "https://mcp.windsor.ai/" })) url.searchParams.set(key, value);
  return Response.redirect(url, 303);
}
