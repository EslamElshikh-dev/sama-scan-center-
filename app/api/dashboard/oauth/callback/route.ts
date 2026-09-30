import { cookies } from "next/headers";
import { APP_ORIGIN, CALLBACK, CLIENT_ID, STATE_COOKIE, ACCESS_COOKIE, cookieOptions, verifyToken, requireAdmin } from "@/lib/dashboard/auth";
export async function GET(request: Request) {
  const jar = await cookies(), url = new URL(request.url);
  const raw = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  try {
    await requireAdmin();
    if (!raw || url.origin !== APP_ORIGIN) throw new Error();
    const saved = JSON.parse(raw) as { state: string; verifier: string; expires: number };
    const code = url.searchParams.get("code");
    if (!code || saved.state !== url.searchParams.get("state") || saved.expires < Date.now()) throw new Error();
    const issuer = url.searchParams.get("iss");
    if (issuer && issuer !== "https://mcp.windsor.ai/") throw new Error();
    const response = await fetch("https://mcp.windsor.ai/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, cache: "no-store", signal: AbortSignal.timeout(15000),
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: CALLBACK, client_id: CLIENT_ID, code_verifier: saved.verifier, resource: "https://mcp.windsor.ai/" }),
    });
    if (!response.ok) throw new Error();
    const token = await response.json() as { access_token?: string; expires_in?: number };
    if (!token.access_token) throw new Error();
    await verifyToken(token.access_token);
    jar.set(ACCESS_COOKIE, token.access_token, { ...cookieOptions, maxAge: Math.min(Number(token.expires_in) || 3600, 28800) });
    return Response.redirect(`${APP_ORIGIN}/dashboard`, 303);
  } catch { return Response.redirect(`${APP_ORIGIN}/dashboard?error=signin`, 303); }
}
