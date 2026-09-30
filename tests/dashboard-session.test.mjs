import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createHandler } from "../backend/samascan-admin/index.mjs";
const source = readFileSync(new URL("../lib/dashboard/session.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const auth = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const originalFetch = globalThis.fetch;
const token = "a".repeat(64);
const env = { get: key => ({ SUPABASE_URL: "https://auth.example", SUPABASE_PUBLISHABLE_KEYS: '{"default":"public-test"}', SUPABASE_SECRET_KEYS: '{"default":"private-test"}' })[key] };
const req = body => new Request("https://auth.example/login", { method: "POST", headers: { apikey: "public-test", "Content-Type": "application/json" }, body: JSON.stringify(body) });
test("client rejects malformed, expired, missing-role and untrusted-status sessions", async () => {
 try {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ ok: true, username: "admin", role: "admin", displayName: "Admin", expiresAt: Date.now()+10000 }); };
  assert.equal(await auth.verifySession("forged"), false); assert.equal(calls, 0);
  assert.equal(await auth.verifySession(token), true);
  globalThis.fetch = async () => Response.json({ok:true,username:"reception",role:"reception",displayName:"Reception",expiresAt:Date.now()+10000});
  assert.deepEqual(await auth.sessionUser(token),{username:"reception",role:"reception",displayName:"Reception"});
  for (const result of [{ ok:true, username:"other", expiresAt:Date.now()+10000 }, { ok:true, username:"admin", role:"admin", displayName:"Admin", expiresAt:1 }, { ok:false }]) {
   globalThis.fetch = async () => Response.json(result); assert.equal(await auth.verifySession(token), false);
  }
  globalThis.fetch = async () => Response.json({ ok:true, username:"admin", role:"admin", displayName:"Admin", expiresAt:Date.now()+10000 }, {status:401});
  await assert.rejects(auth.verifySession(token), /AUTH_SERVICE_UNAVAILABLE/);
  globalThis.fetch = async () => { throw new Error("upstream secret must not escape"); };
  await assert.rejects(auth.verifySession(token), /^Error: AUTH_SERVICE_UNAVAILABLE$/);
 } finally { globalThis.fetch = originalFetch; }
});
test("client handles credentials, throttling, and validates issued tokens", async () => {
 try {
  globalThis.fetch = async () => Response.json({ok:false,code:"credentials"},{status:401});
  await assert.rejects(auth.loginAdmin("admin","test"), /^Error: credentials$/);
  globalThis.fetch = async () => Response.json({ok:false,code:"rate_limit"},{status:429});
  await assert.rejects(auth.loginAdmin("admin","test"), /^Error: rate_limit$/);
  globalThis.fetch = async () => Response.json({ok:true,username:"admin",token,expiresAt:Date.now()+10000});
  assert.equal(await auth.loginAdmin("admin","test"), token);
  globalThis.fetch = async () => Response.json({ok:true,username:"admin",token:"invalid",expiresAt:Date.now()+10000});
  await assert.rejects(auth.loginAdmin("admin","test"), /AUTH_SERVICE_UNAVAILABLE/);
 } finally { globalThis.fetch = originalFetch; }
});
test("edge gateway validates requests before privileged database access", async () => {
 let calls=0;
 const handler=createHandler(env,async (_url,opts)=>{calls++; assert.equal(opts.headers.apikey,"private-test"); assert.equal(opts.headers.Authorization,undefined); return Response.json({ok:false,code:"credentials"});});
 assert.equal((await handler(new Request("https://auth.example"))).status,405);
 assert.equal((await handler(new Request("https://auth.example",{method:"POST",body:"{}"}))).status,401);
 assert.equal((await handler(req({action:"verify",token:"bad"}))).status,401);
 assert.equal((await handler(req({action:"unexpected"}))).status,400);
 assert.equal(calls,0);
 const denied=await handler(req({action:"login",username:"admin",password:"wrong"}));
 assert.equal(denied.status,401); assert.equal(calls,1);
 assert.equal((await denied.text()).includes("private-test"),false);
});
test("edge gateway returns safe errors and preserves throttle status",async()=>{
 const failing=createHandler(env,async()=>new Response("private database detail",{status:500}));
 const failed=await failing(req({action:"verify",token})); assert.equal(failed.status,503); assert.equal((await failed.text()).includes("private database detail"),false);
 const limited=createHandler(env,async()=>Response.json({ok:false,code:"rate_limit"}));
 assert.equal((await limited(req({action:"login",username:"admin",password:"test"}))).status,429);
});
