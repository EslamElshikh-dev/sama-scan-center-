import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../backend/samascan-crm/index.mjs';
const token='a'.repeat(64);
const env={get:key=>({SUPABASE_URL:'https://crm.example',SUPABASE_PUBLISHABLE_KEYS:'{"default":"public-test"}',SUPABASE_SECRET_KEYS:'{"default":"private-test"}'})[key]};
const req=body=>new Request('https://crm.example',{method:'POST',headers:{apikey:'public-test','Content-Type':'application/json'},body:JSON.stringify(body)});
test('CRM rejects unauthenticated, oversized and unsupported requests before RPC',async()=>{
 let count=0;const handler=createHandler(env,async()=>{count++;return Response.json({ok:true});});
 assert.equal((await handler(req({action:'summary',token:'bad'}))).status,401);
 assert.equal((await handler(req({action:'delete_all',token}))).status,400);
 assert.equal((await handler(req({action:'save',token,payload:[]}))).status,400);
 assert.equal((await handler(req({action:'save',token,payload:{note:'x'.repeat(17000)}}))).status,400);
 assert.equal(count,0);
});
test('CRM forwards session for authoritative database authorization and preserves safe conflicts',async()=>{
 const handler=createHandler(env,async(url,options)=>{assert.equal(url,'https://crm.example/rest/v1/rpc/samascan_crm_api');assert.equal(options.headers.apikey,'private-test');assert.deepEqual(JSON.parse(options.body),{session_token:token,action:'save',payload:{entity:'appointments'}});return Response.json({ok:false,code:'overlap'});});
 const response=await handler(req({action:'save',token,payload:{entity:'appointments'}}));assert.equal(response.status,409);assert.deepEqual(await response.json(),{ok:false,code:'overlap'});
});
test('CRM does not expose database errors or accept authorization failures as success',async()=>{
 for(const [code,status] of [['credentials',401],['forbidden',403],['conflict',409]]){const handler=createHandler(env,async()=>Response.json({ok:false,code}));assert.equal((await handler(req({action:'summary',token}))).status,status);}
 const handler=createHandler(env,async()=>new Response('internal SQL and secret',{status:500}));const res=await handler(req({action:'summary',token}));assert.equal(res.status,503);assert.equal((await res.text()).includes('secret'),false);
});

test('source outcomes use the same authenticated gateway',async()=>{
 const handler=createHandler(env,async(url,options)=>{assert.equal(url,'https://crm.example/rest/v1/rpc/samascan_outcome_report');assert.equal(JSON.parse(options.body).action,'source_report');return Response.json({ok:true,data:{sources:[]}});});
 assert.equal((await handler(req({action:'source_report',token,payload:{from:'2026-09-01',to:'2026-09-30'}}))).status,200);
 assert.equal((await handler(req({action:'source_report',token:'forged'}))).status,401);
});

test('physician actions reach only the referral RPC and enforce the same session gate',async()=>{
 for(const action of ['physician_options','physician_list','physician_detail','physician_save','visit_list','visit_save','physician_report']){
  let calls=0;
  const handler=createHandler(env,async(url,options)=>{calls++;assert.equal(url,'https://crm.example/rest/v1/rpc/samascan_referral_api');assert.deepEqual(JSON.parse(options.body),{session_token:token,action,payload:{}});return Response.json({ok:false,code:'forbidden',internal:'sensitive'});});
  const response=await handler(req({action,token}));assert.equal(response.status,403);assert.deepEqual(await response.json(),{ok:false,code:'forbidden'});
  assert.equal((await handler(req({action,token:'forged'}))).status,401);assert.equal(calls,1);
 }
});
