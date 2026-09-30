import { cookies } from "next/headers";
import { sessionUser } from "./session";

export const APP_ORIGIN = "https://samascan.vercel.app";
export const ADMIN_COOKIE = "__Host-sama_admin";
export const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
export async function currentUser() { return sessionUser((await cookies()).get(ADMIN_COOKIE)?.value); }
export async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "admin") throw new Error("SIGN_IN_REQUIRED");
  return user.username;
}
export async function signedIn() { try { return Boolean(await currentUser()); } catch { return false; } }
