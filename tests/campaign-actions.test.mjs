import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

let session, rows, writes, dbError, signedPaths;
globalThis.__campaignTest = {
  session: () => session,
  db: {
    storage: { from(bucket) { assert.equal(bucket,'media'); return { async createSignedUploadUrl(path) {
      signedPaths.push(path); return dbError ? {error:dbError} : {data:{token:'test-token'}};
    }}; } },
    from(table) {
      assert.equal(table,'ad_campaigns');
      let operation = 'select', values, filters=[];
      const query = {
        select(){return this;},
        eq(k,v){filters.push([k,v]);return this;},
        insert(v){operation='insert';values=v;return this;},
        update(v){operation='update';values=v;return this;},
        delete(){operation='delete';return this;},
        single(){return this.execute();}, maybeSingle(){return this.execute();},
        async execute(){
          if (dbError) return {data:null,error:dbError};
          if(operation==='insert') { const row={...values,id:`ad-${rows.length+1}`};rows.push(row);writes.push({operation,values,filters});return {data:row}; }
          const row=rows.find(r=>filters.every(([k,v])=>r[k]===v));
          if(operation==='select') return {data:row||null};
          writes.push({operation,values,filters});
          if(row && operation==='update') Object.assign(row,values);
          if(row && operation==='delete') rows=rows.filter(r=>r!==row);
          return {data:row||null};
        },
      };
      return query;
    },
  },
};
const compiled=await build({entryPoints:['api/campaign.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{
  name:'dependencies',setup(b){
    b.onLoad({filter:/supabaseAdmin\.ts$/},()=>({loader:'js',contents:'export const getSupabaseAdmin=()=>globalThis.__campaignTest.db;'}));
    b.onLoad({filter:/auth-utils\.ts$/},()=>({loader:'js',contents:'export const readSessionFromRequest=()=>globalThis.__campaignTest.session();'}));
  },
}]});
const {default:handler}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const valid=(type='channel')=>({title:'Test ad',text:'Test text',url:'https://t.me/example',type,cpm:1,budget:0,daily_views:1,status:'hold',countries:['Uzbekistan'],schedule_enabled:false});
async function run(method='POST',body=valid(),query={}){
  const res={status(c){this.code=c;return this;},json(b){this.body=b;return this;},setHeader(){}};
  await handler({method,body,query},res);return res;
}
test.beforeEach(()=>{session={user_id:'client-a',agency_id:'agency-a',role:'client'};rows=[];writes=[];dbError=null;signedPaths=[];});
for(const type of ['search','bot','user','channel']) test(`${type}: create, reload, edit and delete own campaign`,async()=>{
  const created=await run('POST',valid(type));assert.equal(created.code,201);
  const id=created.body.data.id;
  assert.equal(rows[0].client_id,'client-a');assert.equal(rows[0].agency_id,'agency-a');assert.equal(rows[0].status,'On Hold');
  assert.equal((await run('GET',null,{id})).body.data.status,'hold');
  assert.equal((await run('PATCH',{...valid(type),title:'Changed'},{id})).code,200);
  assert.equal((await run('GET',null,{id})).body.data.title,'Changed');
  assert.ok(writes[1].filters.some(([k,v])=>k==='client_id'&&v==='client-a'));
  assert.equal((await run('DELETE',null,{id})).code,200);
  assert.equal((await run('GET',null,{id})).code,404);
});
test('browser cannot assign ownership, metrics, ids or timestamps',async()=>{
  await run('POST',{...valid(),client_id:'victim',agency_id:'victim',id:'victim',views:9000,actions:100,created_at:'fake',spend:900});
  assert.equal(rows[0].client_id,'client-a');assert.equal(rows[0].agency_id,'agency-a');
  assert.equal(rows[0].views,undefined);assert.equal(rows[0].spend,undefined);assert.notEqual(rows[0].created_at,'fake');
  const id=rows[0].id;
  await run('PATCH',{...valid(),client_id:'victim',agency_id:'victim',views:999},{id});
  assert.equal(rows[0].client_id,'client-a');assert.equal(rows[0].agency_id,'agency-a');assert.equal(rows[0].views,undefined);
});
test('client cannot read, update or delete a different client campaign',async()=>{
  rows=[{id:'other',client_id:'other-client',agency_id:'agency-a',type:'channel'}];
  for(const method of ['GET','PATCH','DELETE']) assert.equal((await run(method,valid(),{id:'other'})).code,403);
  assert.equal(writes.length,0);
});
test('agency can edit its client without reassigning campaign ownership',async()=>{
  session.role='agency';session.user_id='agency-a';rows=[{id:'ad',client_id:'client-a',agency_id:'agency-a',type:'channel'}];
  assert.equal((await run('PATCH',valid(),{id:'ad'})).code,200);assert.equal(rows[0].client_id,'client-a');
  assert.ok(writes[0].filters.some(([k,v])=>k==='agency_id'&&v==='agency-a'));
  session.agency_id='agency-b';assert.equal((await run('DELETE',null,{id:'ad'})).code,403);
});
test('unlinked agency cannot access unlinked client campaign',async()=>{
  session.role='agency';session.agency_id=null;rows=[{id:'ad',agency_id:null}];
  assert.equal((await run('GET',null,{id:'ad'})).code,403);
});
test('missing session and unknown roles are rejected before mutation',async()=>{
  session=null;for(const method of ['GET','POST','PATCH','DELETE']) assert.equal((await run(method)).code,401);
  session={role:'unexpected',user_id:'a'};assert.equal((await run()).code,403);assert.equal(writes.length,0);
});
test('invalid content and amounts return actionable validation errors',async()=>{
  for(const change of [{title:''},{cpm:-1},{cpm:NaN},{budget:Infinity},{budget:-1},{daily_views:7},{type:'fake'},{countries:'Uzbekistan'},{status:'fake'},{url:'javascript:alert(1)'},{end_date:'no date'},{media_type:'script'}]) {
    assert.equal((await run('POST',{...valid(),...change})).code,400,JSON.stringify(change));
  }
  assert.equal(writes.length,0);
});
test('database rejection is not reported as a successful save',async()=>{
  dbError={code:'42501',message:'private details'};const res=await run();assert.equal(res.code,503);assert.ok(!res.body.error.includes('private details'));
});
test('upload authorizations use random per-user ASCII keys and reject unsupported media',async()=>{
  for(const contentType of ['image/jpeg','video/mp4']) {
    const res=await run('POST',{contentType,path:'../../someone-else'},{action:'media-upload'});
    assert.equal(res.code,200);assert.match(res.body.path,/^ads\/client-a\/[a-f0-9-]+\.(jpg|mp4)$/);
  }
  assert.notEqual(signedPaths[0],signedPaths[1]);
  assert.equal((await run('POST',{contentType:'text/html'},{action:'media-upload'})).code,400);
  session=null;assert.equal((await run('POST',{contentType:'image/jpeg'},{action:'media-upload'})).code,401);
});
test.after(()=>delete globalThis.__campaignTest);
