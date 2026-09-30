import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source=readFileSync(new URL("../lib/dashboard/session.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const auth=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const salt=randomBytes(16), testPassword=randomBytes(20).toString("hex");
const digest=scryptSync(testPassword,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
const config={passwordHash:`scrypt$32768$${salt.toString("hex")}$${digest.toString("hex")}`,secret:randomBytes(32).toString("base64url")};
test("password verifier accepts the correct password and rejects wrong or malformed inputs",async()=>{
 assert.equal(await auth.verifyPassword(testPassword,config.passwordHash),true);
 assert.equal(await auth.verifyPassword("wrong",config.passwordHash),false);
 assert.equal(await auth.verifyPassword(testPassword,"broken"),false);
 assert.equal(await auth.verifyPassword("x".repeat(257),config.passwordHash),false);
});
test("session signature, expiry and credential rotation are enforced",()=>{
 const now=1790760000000,token=auth.createSession(config,now);
 assert.equal(auth.verifySession(token,config,now),true);
 assert.equal(auth.verifySession(token,config,now+auth.SESSION_SECONDS*1000),false);
 assert.equal(auth.verifySession(token,config,now-1000),false);
 assert.equal(auth.verifySession(token+"x",config,now),false);
 const [body,signature]=token.split(".");const changed=JSON.parse(Buffer.from(body,"base64url"));changed.exp+=3600;
 assert.equal(auth.verifySession(Buffer.from(JSON.stringify(changed)).toString("base64url")+"."+signature,config,now),false);
 assert.equal(auth.verifySession(token,{...config,secret:randomBytes(32).toString("base64url")},now),false);
 assert.equal(auth.verifySession(token,{...config,passwordHash:config.passwordHash.replace("scrypt","changed")},now),false);
 assert.equal(auth.verifySession(undefined,config,now),false);
});
test("login throttling blocks repeated attempts and resets after the time window",()=>{
 const key=randomBytes(16).toString("hex"),now=1000000;
 for(let i=0;i<5;i++)assert.equal(auth.loginAttempt(key,now),true);
 assert.equal(auth.loginAttempt(key,now),false);
 assert.equal(auth.loginAttempt(key,now+15*60*1000),true);
 auth.clearAttempts(key);assert.equal(auth.loginAttempt(key,now+15*60*1000),true);
});
