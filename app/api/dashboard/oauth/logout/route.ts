import { cookies } from "next/headers";
import { ACCESS_COOKIE, APP_ORIGIN } from "@/lib/dashboard/auth";
import { originOK } from "@/lib/dashboard/server";
export async function POST(request: Request) {
  if (!originOK(request)) return new Response(null, { status: 403 });
  (await cookies()).delete(ACCESS_COOKIE);
  return Response.redirect(`${APP_ORIGIN}/dashboard`, 303);
}
