import { createHash } from "node:crypto";
const OWNER_HASH = "01efe411983bdfb98ef0e8d01e76fb5b6ab3ad2a0104277b50276a4749d40cf8";
export function isAllowedUser(username: unknown) { return typeof username === "string" && createHash("sha256").update(username.toLowerCase()).digest("hex") === OWNER_HASH; }
