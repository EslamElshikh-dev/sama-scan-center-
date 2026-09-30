import { cookies } from "next/headers";
import { verifySession } from "./session";

export const APP_ORIGIN = "https://samascan.vercel.app";
export const ADMIN_COOKIE = "__Host-sama_admin";
export const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
export async function requireAdmin() {
  if (!await verifySession((await cookies()).get(ADMIN_COOKIE)?.value)) throw new Error("SIGN_IN_REQUIRED");
  return "samascan-admin";
}
export async function signedIn() { try { await requireAdmin(); return true; } catch { return false; } }
