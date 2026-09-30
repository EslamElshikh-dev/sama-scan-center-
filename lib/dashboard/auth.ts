import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { callMcp } from "./mcp";
import { isAllowedUser } from "./identity";
import { payload } from "@/lib/sama";

export const APP_ORIGIN = "https://samascan.vercel.app";
export const CLIENT_ID = `${APP_ORIGIN}/api/dashboard/oauth/client`;
export const CALLBACK = `${APP_ORIGIN}/api/dashboard/oauth/callback`;
export const ACCESS_COOKIE = "__Host-sama_access";
export const STATE_COOKIE = "__Host-sama_oauth";
export const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
const verified = new Map<string, { username: string; until: number }>();

export async function verifyToken(token: string) {
  if (!token || token.length > 3600) throw new Error("SIGN_IN_REQUIRED");
  const key = createHash("sha256").update(token).digest("hex");
  const cached = verified.get(key);
  if (cached && cached.until > Date.now()) return cached.username;
  const response = await callMcp(token, "get_current_user", {});
  const value = payload(response) as { username?: string } | null;
  if (response.isError || !value || !isAllowedUser(value.username)) throw new Error("SIGN_IN_REQUIRED");
  if (verified.size > 128) verified.clear();
  verified.set(key, { username: value.username!, until: Date.now() + 30000 });
  return value.username!;
}
export async function accessToken() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) throw new Error("SIGN_IN_REQUIRED");
  await verifyToken(token);
  return token;
}
export async function owner() { return verifyToken(await accessToken()); }
export async function signedIn() { try { await accessToken(); return true; } catch { return false; } }
