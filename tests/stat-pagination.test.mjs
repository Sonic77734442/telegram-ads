import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['shared/load-stat-rows.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {loadStatRows}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
test('statistics past 1000 rows are not truncated',async()=>{
 const source=Array.from({length:2501},(_,id)=>({id,views:id})),ranges=[];
 const db={from(){return {select(){return this},eq(){return this},order(){return this},range(a,b){ranges.push([a,b]);return {data:source.slice(a,b+1),error:null}}}}};
 const r=await loadStatRows(db,'ad','views');assert.deepEqual(r.data,source);assert.deepEqual(ranges,[[0,999],[1000,1999],[2000,2999]]);
});
test('a failed later page never returns partial statistics',async()=>{
 const db={from(){return {select(){return this},eq(){return this},order(){return this},range(a){return a?{error:{message:'offline'}}:{data:Array(1000).fill({views:1})}}}}};
 const r=await loadStatRows(db,'ad','views');assert.equal(r.data,null);assert.equal(r.error.message,'offline');
});
