import { createClient, type Client, type InValue } from "@libsql/client";

let client: Client | undefined;
let ready: Promise<void> | undefined;
const schema = [
  "CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY,owner TEXT NOT NULL,body TEXT NOT NULL,channels TEXT NOT NULL,asset TEXT,image_url TEXT,cta TEXT NOT NULL DEFAULT 'CALL',status TEXT NOT NULL DEFAULT 'draft',created INTEGER NOT NULL,updated INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS posts_owner_updated ON posts(owner,updated)",
  "CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL,url TEXT,public_token TEXT UNIQUE)",
  "CREATE TABLE IF NOT EXISTS links (owner TEXT NOT NULL,channel TEXT NOT NULL,account TEXT NOT NULL,name TEXT NOT NULL,PRIMARY KEY(owner,channel))",
  "CREATE TABLE IF NOT EXISTS deliveries (post TEXT NOT NULL,channel TEXT NOT NULL,status TEXT NOT NULL,result TEXT,updated INTEGER NOT NULL,PRIMARY KEY(post,channel))",
  "CREATE TABLE IF NOT EXISTS improvements (owner TEXT NOT NULL,key TEXT NOT NULL,done INTEGER NOT NULL,PRIMARY KEY(owner,key))",
];
export function storageReady() { return Boolean(process.env.DASHBOARD_DATABASE_URL && process.env.DASHBOARD_DATABASE_AUTH_TOKEN); }
export function database() {
  if (!storageReady()) throw new Error("STORAGE_UNAVAILABLE");
  client ??= createClient({ url: process.env.DASHBOARD_DATABASE_URL!, authToken: process.env.DASHBOARD_DATABASE_AUTH_TOKEN! });
  ready ??= client.batch(schema, "write").then(() => {}).catch(e => { ready = undefined; throw e; });
  return { prepare(sql: string) {
    let args: InValue[] = [];
    const execute = async () => { await ready; return client!.execute({ sql, args }); };
    return {
      bind(...values: unknown[]) { args = values as InValue[]; return this; },
      async all() { const result = await execute(); return { results: result.rows as unknown as Record<string, unknown>[] }; },
      async first() { const result = await execute(); return result.rows[0] as unknown as Record<string, unknown> | undefined; },
      async run() { const result = await execute(); return { meta: { changes: result.rowsAffected } }; },
    };
  } };
}
