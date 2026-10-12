import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const r=await build({entryPoints:['shared/manual-stats.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {numberInput,checkDailyStats}=await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);
test('pasted numbers accept spaces and decimal commas without accepting junk',()=>{
 assert.equal(numberInput('50 000'),50000);assert.equal(numberInput('2,50'),2.5);
 for(const v of ['','abc','-5','1,2,3'])assert.ok(Number.isNaN(numberInput(v)));
});
test('exact total and daily budget boundary is valid',()=>{
 const v=checkDailyStats(5000,20,2,100,10,90);assert.deepEqual(v.errors,[]);assert.equal(v.spend,10);assert.equal(v.remaining,0);
});
test('checks both total and daily overspend',()=>{
 const v=checkDailyStats(6000,20,2,100,10,90);assert.equal(v.errors.length,2);
});
test('replacing a day uses other-day spend and does not double count',()=>{
 assert.deepEqual(checkDailyStats(5000,20,2,100,10,90).errors,[]);
});
test('zero daily budget is unlimited, zero total budget still blocks spending',()=>{
 assert.deepEqual(checkDailyStats(5000,20,2,100,0,0).errors,[]);
 assert.equal(checkDailyStats(5000,20,2,0,0,0).errors.length,1);
});
test('invalid numbers, clicks above views and zero CPM cannot save',()=>{
 for(const args of [[1.5,0,2],[10,11,2],[10,0,0],[NaN,0,2],[10,0,Infinity]])assert.ok(checkDailyStats(...args,100,10,0).errors.length);
});
let role='admin',rpcCalls=0;
globalThis.__manual={db:{rpc:async()=>{rpcCalls++;return {data:{saved:true}}}}};
const h=await build({entryPoints:['shared/admin-stats-handler.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'mock',setup(b){b.onLoad({filter:/supabaseAdmin\.ts$/},()=>({loader:'js',contents:'export const getSupabaseAdmin=()=>globalThis.__manual.db'}));}}]});
const {adminStats}=await import(`data:text/javascript;base64,${Buffer.from(h.outputFiles[0].text).toString('base64')}`);
async function call(role,body){const res={status(c){this.code=c;return this},json(b){this.body=b;return this},setHeader(){}};await adminStats({method:'POST',body},res,{role,user_id:'owner'});return res;}
const good={ad_id:'00000000-0000-0000-0000-000000000002',day:'2026-10-01',views:1000,clicks:10,cpm:2,revision:'revision'};
test('agency and client cannot call admin writes',async()=>{rpcCalls=0;for(const role of ['agency','client'])assert.equal((await call(role,good)).code,403);assert.equal(rpcCalls,0)});
test('invalid dates and metrics never reach storage',async()=>{rpcCalls=0;for(const b of [{...good,day:'2026-02-30'},{...good,views:-1},{...good,clicks:1001},{...good,revision:null}])assert.equal((await call('admin',b)).code,400);assert.equal(rpcCalls,0)});
test('admin writes delegate to atomic budget-checked RPC',async()=>{assert.equal((await call('admin',good)).code,200)});

test('distribution is generated on server and preserves exact requested totals',async()=>{
 let called;globalThis.__manual.db.rpc=async(name,params)=>{called={name,params};return {data:{}}};
 const r=await call('admin',{...good,mode:'distribution',start:'09:00',end:'23:00',slots:[{views:999999}]});
 assert.equal(r.code,200);assert.equal(called.name,'admin_schedule_statistics');
 assert.equal(called.params.p_slots.reduce((n,s)=>n+s.views,0),1000);
 assert.equal(called.params.p_slots.reduce((n,s)=>n+s.clicks,0),10);
 assert.equal(called.params.p_actor,'owner');
});
test('invalid distribution time is rejected before storage',async()=>{
 let called=false;globalThis.__manual.db.rpc=async()=>{called=true;return {data:{}}};
 assert.equal((await call('admin',{...good,mode:'distribution',start:'23:00',end:'09:00'})).code,400);assert.equal(called,false);
});
test('only admin can cancel a plan and revision is passed to storage',async()=>{
 let called;globalThis.__manual.db.rpc=async(name,params)=>{called={name,params};return {data:{}}};
 const body={ad_id:good.ad_id,day:good.day,revision:'current',mode:'cancel-distribution'};
 for(const role of ['agency','client'])assert.equal((await call(role,body)).code,403);
 assert.equal(called,undefined);assert.equal((await call('admin',body)).code,200);
 assert.equal(called.params.p_cancel,true);assert.equal(called.params.p_revision,'current');
});
