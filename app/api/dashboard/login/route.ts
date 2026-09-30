import { cookies } from "next/headers";
import { ADMIN_COOKIE, cookieOptions } from "@/lib/dashboard/auth";
import { SESSION_SECONDS, loginAdmin } from "@/lib/dashboard/session";
import { headers, originOK } from "@/lib/dashboard/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!originOK(request)) return new Response(null, { status: 403, headers });
  const destination = new URL("/dashboard", request.url);
  const redirect = (reason?: string) => {
    if (reason) destination.searchParams.set("error", reason);
    return new Response(null, { status: 303, headers: { ...headers, Location: destination.toString() } });
  };
  if (Number(request.headers.get("content-length")) > 2048) return redirect("credentials");
  try {
    const raw = await request.text();
    if (raw.length > 2048) return redirect("credentials");
    const form = new URLSearchParams(raw);
    const token = await loginAdmin(form.get("username") || "", form.get("password") || "");
    (await cookies()).set(ADMIN_COOKIE, token, { ...cookieOptions, maxAge: SESSION_SECONDS });
    return redirect();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "AUTH_SERVICE_UNAVAILABLE";
    return redirect(reason === "rate_limit" ? "rate_limit" : reason === "credentials" ? "credentials" : "auth_service");
  }
}
