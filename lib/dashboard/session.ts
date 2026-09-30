import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const ADMIN_USERNAME = "admin";
export const SESSION_SECONDS = 8 * 60 * 60;
export type AdminConfig = { passwordHash: string; secret: string };
const hashPattern = /^scrypt\$32768\$([a-f0-9]{32})\$([a-f0-9]{64})$/;

export function readAdminConfig(): AdminConfig | null {
  const passwordHash = process.env.SAMA_ADMIN_PASSWORD_HASH;
  const secret = process.env.SAMA_SESSION_SECRET;
  if (!passwordHash || !hashPattern.test(passwordHash) || !secret || secret.length < 43) return null;
  return { passwordHash, secret };
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const match = hashPattern.exec(encoded);
  if (!match || password.length > 256) return false;
  const actual = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, Buffer.from(match[1], "hex"), 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
  });
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}

function sign(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("base64url"); }
function version(config: AdminConfig) { return createHash("sha256").update(config.passwordHash).digest("hex").slice(0, 24); }
export function createSession(config: AdminConfig, now = Date.now()) {
  const issued = Math.floor(now / 1000);
  const value = Buffer.from(JSON.stringify({ sub: ADMIN_USERNAME, aud: "samascan-dashboard", iat: issued, exp: issued + SESSION_SECONDS, ver: version(config), nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${value}.${sign(value, config.secret)}`;
}
export function verifySession(token: string | undefined, config: AdminConfig, now = Date.now()): boolean {
  if (!token || token.length > 1024) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
  const expected = Buffer.from(sign(parts[0], config.secret));
  const actual = Buffer.from(parts[1]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const body = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as Record<string, unknown>;
    const seconds = Math.floor(now / 1000);
    return body.sub === ADMIN_USERNAME && body.aud === "samascan-dashboard" && body.ver === version(config)
      && typeof body.iat === "number" && Number.isSafeInteger(body.iat) && body.iat <= seconds
      && typeof body.exp === "number" && body.exp > seconds && body.exp === body.iat + SESSION_SECONDS;
  } catch { return false; }
}

// Bounded, short-lived throttling per function instance. No raw client IP is retained.
const attempts = new Map<string, { count: number; reset: number }>();
export function loginAttempt(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);
  if (entry && entry.reset > now) {
    if (entry.count >= 5) return false;
    entry.count++;
    return true;
  }
  if (attempts.size >= 5000) {
    for (const [id, value] of attempts) if (value.reset <= now) attempts.delete(id);
    if (attempts.size >= 5000) return false;
  }
  attempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
  return true;
}
export function clearAttempts(key: string) { attempts.delete(key); }
