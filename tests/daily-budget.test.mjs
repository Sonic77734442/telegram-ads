import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
let daily=5,markup=0,rawError=null;
globalThis.__dailyBudget={from(table){return {
 select(){return this},eq(){return this},order(){return this},in(){return this},range(){return this},
 maybeSingle(){return {data:{markup_percent:markup}}},
 then(resolve){return Promise.resolve(table==='ad_campaigns'?{data:[{id:'ad',daily_budget:daily,actions:0}],error:rawError}:table==='ad_stats'?{data:[]}:{data:[{id:'ad',title:'Ad',client_id:'client',budget_net:6,daily_budget_net:0,daily_budget_client:0,cpm_net:2,views:0,created_at:'2026-10-01'}]}).then(resolve)}
}}};
const compiled=await build({entryPoints:['api/campaigns.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'mock',setup(b){
 b.onLoad({filter:/supabaseAdmin\.ts$/},()=>({loader:'js',contents:'export const getSupabaseAdmin=()=>globalThis.__dailyBudget;'}));
 b.onLoad({filter:/auth-utils\.ts$/},()=>({loader:'js',contents:'export const readSessionFromRequest=()=>({role:"client",user_id:"client"});'}));
}}]});
const handler=(await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)).default;
async function run(){const res={setHeader(){},status(c){this.code=c;return this},json(b){this.body=b;return this}};await handler({method:'GET',query:{}},res);return res;}
test('saved daily limit overrides stale zero from compatibility view',async()=>{daily=5;markup=0;const r=await run();assert.equal(r.code,200);assert.equal(r.body.data[0].daily_budget_net,5);assert.equal(r.body.data[0].daily_budget_client,5)});
test('client markup is applied exactly once to current daily limit',async()=>{daily=5;markup=20;const r=await run();assert.equal(r.body.data[0].daily_budget_net,5);assert.equal(r.body.data[0].daily_budget_client,6)});
test('zero daily limit remains unlimited',async()=>{daily=0;const r=await run();assert.equal(r.body.data[0].daily_budget_net,0);assert.equal(r.body.data[0].daily_budget_client,0)});
test('failed authoritative read does not display stale budget',async()=>{rawError={message:'offline'};const r=await run();assert.equal(r.code,503);assert.equal(r.body.data,undefined)});
