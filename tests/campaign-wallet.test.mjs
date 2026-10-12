import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
let rpcError=null,calls=[],role='client',owner='client';
globalThis.__walletApi={session:()=>({role,user_id:'client',agency_id:'agency'}),db:{from(){return{select(){return this},eq(){return this},single(){return{data:{id:'ad',client_id:owner,agency_id:'agency',budget:10}}}}},rpc:async(name,args)=>{calls.push({name,args});return{error:rpcError}}}};
const compiled=await build({entryPoints:['api/campaigns-budget.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'mock',setup(b){b.onLoad({filter:/supabaseAdmin\.ts$/},()=>({loader:'js',contents:'export const getSupabaseAdmin=()=>globalThis.__walletApi.db'}));b.onLoad({filter:/auth-utils\.ts$/},()=>({loader:'js',contents:'export const readSessionFromRequest=()=>globalThis.__walletApi.session()'}))}}]});
const handler=(await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)).default;
async function run(body={}){const r={status(c){this.code=c;return this},json(b){this.body=b;return this}};await handler({method:'POST',body:{ad_id:'ad',mode:'increase',amount:5,request_id:'00000000-0000-0000-0000-000000000003',...body}},r);return r;}
test.beforeEach(()=>{rpcError=null;calls=[];role='client';owner='client'});
test('allocation uses authenticated actor and durable request ID',async()=>{assert.equal((await run({actor:'victim'})).code,200);assert.equal(calls[0].name,'increase_campaign_budget');assert.equal(calls[0].args.p_actor,'client');assert.equal(calls[0].args.p_request,'00000000-0000-0000-0000-000000000003')});
test('insufficient funds are reported as a conflict with actionable message',async()=>{rpcError={code:'P0001',message:'Недостаточно средств'};const r=await run();assert.equal(r.code,409);assert.equal(r.body.error,'Недостаточно средств')});
test('missing request ID and foreign campaigns cannot allocate money',async()=>{assert.equal((await run({request_id:undefined})).code,400);owner='other';assert.equal((await run()).code,403);assert.equal(calls.length,0)});
