import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieOptions } from "@/lib/dashboard/auth";
import { ADMIN_USERNAME, SESSION_SECONDS, clearAttempts, createSession, loginAttempt, readAdminConfig, verifyPassword } from "@/lib/dashboard/session";
import { headers, originOK } from "@/lib/dashboard/server";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!originOK(request)) return new Response(null, { status: 403, headers });
  const destination = new URL("/dashboard", request.url);
  const fail = (reason: string) => {
    destination.searchParams.set("error", reason);
    return new Response(null, { status: 303, headers: { ...headers, Location: destination.toString() } });
  };
  const config = readAdminConfig();
  if (!config) return fail("setup");
  if (Number(request.headers.get("content-length")) > 2048) return fail("credentials");
  // Vercel overwrites this header with the client IP on the hosted project.
  const address = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = createHmac("sha256", config.secret).update(address).digest("hex");
  if (!loginAttempt(key)) return fail("rate_limit");
  try {
    const raw = await request.text();
    if (raw.length > 2048) return fail("credentials");
    const form = new URLSearchParams(raw), username = form.get("username") || "", password = form.get("password") || "";
    const valid = await verifyPassword(password, config.passwordHash);
    if (username !== ADMIN_USERNAME || !valid) return fail("credentials");
    clearAttempts(key);
    (await cookies()).set(ADMIN_COOKIE, createSession(config), { ...cookieOptions, maxAge: SESSION_SECONDS });
    return new Response(null, { status: 303, headers: { ...headers, Location: destination.toString() } });
  } catch { return fail("credentials"); }
}
