import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const r=await build({entryPoints:['shared/distribution.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {distributeDaily,distributionWindow}=await import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);
test('exact totals, nonnegative integer buckets and clicks never above impressions',()=>{
 for(const v of [1,17,50000,2147483647])for(const c of [0,Math.floor(v/2),v]){
 const slots=distributeDaily('campaign','2026-10-12','00:00','24:00',v,c);
 assert.equal(slots.reduce((s,x)=>s+x.views,0),v);assert.equal(slots.reduce((s,x)=>s+x.clicks,0),c);
 for(const x of slots){assert.ok(Number.isInteger(x.views)&&Number.isInteger(x.clicks));assert.ok(x.clicks>=0&&x.clicks<=x.views);}
 }
});
test('stable across refreshes and different between campaigns',()=>{
 const args=['2026-10-12','09:00','23:00',50000,300];const a=distributeDaily('a',...args);
 assert.deepEqual(a,distributeDaily('a',...args));assert.notDeepEqual(a,distributeDaily('b',...args));
 assert.ok(new Set(a.map(x=>x.views)).size>20);assert.ok(a.some(x=>x.views===0));
});
test('timezone and end instant are exact',()=>{const s=distributeDaily('a','2026-10-12','09:00','09:05',10,1);assert.equal(s[0].at,'2026-10-12T04:05:00.000Z');assert.equal(s.length,1)});
test('invalid dates, windows and totals fail',()=>{for(const [a,b] of [['09:00','08:00'],['09:01','10:00'],['00:00','25:00']])assert.throws(()=>distributionWindow('2026-10-12',a,b));assert.throws(()=>distributionWindow('2026-02-30','00:00','24:00'));assert.throws(()=>distributeDaily('a','2026-10-12','00:00','24:00',5,6))});
