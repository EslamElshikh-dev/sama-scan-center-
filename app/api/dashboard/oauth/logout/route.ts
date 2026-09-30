import { cookies } from "next/headers";
import { ACCESS_COOKIE, ADMIN_COOKIE, STATE_COOKIE, APP_ORIGIN } from "@/lib/dashboard/auth";
import { originOK } from "@/lib/dashboard/server";
import { revokeSession } from "@/lib/dashboard/session";
export async function POST(request: Request) {
  if (!originOK(request)) return new Response(null, { status: 403 });
  const jar = await cookies();
  try { await revokeSession(jar.get(ADMIN_COOKIE)?.value); } catch { /* Clear local access even during a provider outage. */ }
  for (const name of [ACCESS_COOKIE, ADMIN_COOKIE, STATE_COOKIE]) jar.delete(name);
  return Response.redirect(`${APP_ORIGIN}/dashboard`, 303);
}
