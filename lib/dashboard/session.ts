import type { User } from "@/lib/crm/types";
export const ADMIN_USERNAME = "admin";
export const SESSION_SECONDS = 8 * 60 * 60;
// Public low-privilege project key. No password or server secret is in this code.
const AUTH_URL = "https://vddoeiggfcwllfxpirep.supabase.co/functions/v1/samascan-admin";
const PUBLISHABLE_KEY = "sb_publishable_ZpjxAzWkEPl2jfJg17iRVg_XYdIs2pO";
const tokenPattern = /^[a-f0-9]{64}$/;
type Result = { ok?: boolean; code?: string; username?: string; token?: string; expiresAt?: number; role?: User["role"]; displayName?: string };
async function requestAuth(body: Record<string, string>): Promise<Result> {
  try {
    const response = await fetch(AUTH_URL, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", apikey: PUBLISHABLE_KEY }, body: JSON.stringify(body),
    });
    if (![200, 401, 429].includes(response.status)) throw new Error();
    const value: unknown = await response.json();
    if (!value || typeof value !== "object") throw new Error();
    const result = value as Result;
    if (response.status !== 200 && result.ok === true) throw new Error();
    return result;
  } catch { throw new Error("AUTH_SERVICE_UNAVAILABLE"); }
}
export async function loginAdmin(username: string, password: string) {
  if (username.length > 64 || password.length > 256) throw new Error("credentials");
  const result = await requestAuth({ action: "login", username, password });
  if (result.ok !== true) throw new Error(result.code === "rate_limit" ? "rate_limit" : "credentials");
  if (result.username !== username || !result.token || !tokenPattern.test(result.token) || !result.expiresAt || result.expiresAt <= Date.now()) throw new Error("AUTH_SERVICE_UNAVAILABLE");
  return result.token;
}
export async function sessionUser(token: string | undefined): Promise<User | null> {
  if (!token || !tokenPattern.test(token)) return null;
  const result = await requestAuth({ action: "verify", token });
  if (result.ok !== true || typeof result.username !== "string" || !/^[a-zA-Z0-9_.-]{3,40}$/.test(result.username) || !result.role || !["admin","reception","marketing"].includes(result.role) || typeof result.displayName !== "string" || typeof result.expiresAt !== "number" || result.expiresAt <= Date.now()) return null;
  return {username:result.username,displayName:result.displayName,role:result.role};
}
export async function verifySession(token: string | undefined) { return Boolean(await sessionUser(token)); }
export async function revokeSession(token: string | undefined) {
  if (token && tokenPattern.test(token)) await requestAuth({ action: "logout", token });
}
