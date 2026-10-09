import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const stats=[
  {timestamp:'2026-10-09T01:00:00Z',day:'2026-10-08',views:1000,clicks:10,cpm:'2'},
  {timestamp:'2026-10-09T02:00:00Z',day:'2026-10-08',views:500,clicks:5,cpm:'5'},
];
globalThis.__statSchema={
  from(table){return {
    select(columns){
      if(table==='ad_stats')for(const key of columns.split(',').map(s=>s.trim()))assert.ok(['timestamp','day','views','clicks','cpm'].includes(key),`unknown ad_stats column ${key}`);
      return this;
    },eq(){return this;},order(){return this;},
    async single(){return {data:{client_id:'client',agency_id:'agency',media_type:'image',cpm:99}};},
    async maybeSingle(){return {data:{markup_percent:50}};},
    then(resolve){return Promise.resolve({data:table==='ad_stats'?stats:[],error:null}).then(resolve);},
  };},
  async rpc(){return {data:[],error:null};},
};
const handlers={};
for(const name of ['budget-stats','export-csv','reports']){
 const compiled=await build({entryPoints:[`api/${name}.ts`],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'db',setup(b){
   b.onLoad({filter:/supabaseAdmin\.ts$/},()=>({loader:'js',contents:'export const getSupabaseAdmin=()=>globalThis.__statSchema;'}));
   b.onLoad({filter:/auth-utils\.ts$/},()=>({loader:'js',contents:'export const readSessionFromRequest=()=>({role:"client",user_id:"client",agency_id:"agency"});'}));
 }}]});
 handlers[name]=(await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)).default;
}
async function run(name,query={}){
 const res={status(c){this.code=c;return this;},json(b){this.body=b;return this;},send(b){this.body=b;return this;},setHeader(){}};
 await handlers[name]({method:'GET',query:{ad_id:'test-ad',ym:'2026-10',...query}},res);return res;
}
test('daily spent uses historical row CPM and reporting day, with client markup exactly once',async()=>{
 const res=await run('budget-stats');assert.equal(res.code,200);assert.deepEqual(res.body.data,[{date:'2026-10-08',amount:6.75}]);
});
test('5min spent uses each row CPM without querying a nonexistent amount column',async()=>{
 const res=await run('budget-stats',{range:'5min'});assert.equal(res.code,200);assert.deepEqual(res.body.data.map(r=>r.amount),[3,3.75]);
});
test('empty monthly RPC falls back to historical CPM without losing spend',async()=>{
 const res=await run('reports');assert.equal(res.code,200);assert.equal(res.body.data[0].amount,6.75);assert.equal(res.body.total.views,1500);assert.equal(res.body.total.amount,6.75);
});
for(const type of ['stats','budget','reports'])test(`${type} CSV succeeds with the actual ad_stats schema`,async()=>{
 const res=await run('export-csv',{type});assert.equal(res.code,200);
 assert.ok(res.body.includes('2026-10-08'));
 assert.ok(res.body.includes(type==='stats'?'1500':type==='budget'?'6.7500':'6.75'));
});
test.after(()=>delete globalThis.__statSchema);
