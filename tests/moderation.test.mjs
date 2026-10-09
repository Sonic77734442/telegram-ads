import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
let session,ad,writes,race;
globalThis.__moderation={session:()=>session,db:{from(){
  let patch,filters=[];
  return {
    select(){return this;},eq(k,v){filters.push([k,v]);return this;},is(k,v){filters.push([k,v]);return this;},
    update(v){patch=v;return this;},insert(v){ad={id:'ad',...v};return this;},
    async single(){return this.execute();},async maybeSingle(){return this.execute();},
    async execute(){
      if(!patch)return {data:ad?{...ad}:null};
      if(race)ad.status=race;
      if(!filters.every(([k,v])=>v===null?ad[k]==null:ad[k]===v))return {data:null};
      writes.push(patch);Object.assign(ad,patch);return {data:{id:ad.id}};
    },
  };
}}};
const handlers={};
for(const name of ['campaign','campaigns-status']) {
  const result=await build({entryPoints:[`api/${name}.ts`],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'mock',setup(b){
    b.onLoad({filter:/supabaseAdmin\.ts$/},()=>({loader:'js',contents:'export const getSupabaseAdmin=()=>globalThis.__moderation.db;'}));
    b.onLoad({filter:/auth-utils\.ts$/},()=>({loader:'js',contents:'export const readSessionFromRequest=()=>globalThis.__moderation.session();'}));
  }}]});
  handlers[name]=(await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)).default;
}
async function run(name,status,method=name==='campaign'?'PATCH':'POST'){
 const res={status(c){this.code=c;return this;},json(b){this.body=b;return this;},setHeader(){}};
 const body=name==='campaign'?{title:'Ad',text:'Text',url:'https://t.me/example',type:'channel',cpm:1,budget:0,status}:{ad_id:'ad',status};
 await handlers[name]({method,body,query:{id:'ad'}},res);return res;
}
test.beforeEach(()=>{session={role:'client',user_id:'client',agency_id:'agency'};ad={id:'ad',client_id:'client',agency_id:'agency',status:'Moderate',type:'channel',schedule_enabled:true,end_date:'2026-12-01'};writes=[];race=null;});
test('new campaign always enters Moderate even if client submits Active',async()=>{
 assert.equal((await run('campaign','active','POST')).code,201);assert.equal(ad.status,'Moderate');
});
for(const name of ['campaign','campaigns-status']) {
 test(`${name}: client cannot approve or bypass moderation via On Hold`,async()=>{
  for(const status of ['active','Active','hold','On Hold','paused'])assert.equal((await run(name,status)).code,403,status);
  assert.equal(ad.status,'Moderate');assert.equal(writes.length,0);
 });
 test(`${name}: only the linked agency can approve Moderate`,async()=>{
  session={role:'agency',user_id:'other',agency_id:'other'};assert.equal((await run(name,'active')).code,403);
  session={role:'admin',user_id:'admin'};assert.equal((await run(name,'active')).code,403);
  session={role:'agency',user_id:'agency',agency_id:'agency'};assert.equal((await run(name,'active')).code,200);assert.equal(ad.status,'Active');
 });
 test(`${name}: client can pause/resume approved ads but cannot select Moderate`,async()=>{
  ad.status='Active';assert.equal((await run(name,'moderate')).code,403);
  assert.equal((await run(name,'hold')).code,200);assert.equal(ad.status,'On Hold');
  assert.equal((await run(name,'active')).code,200);assert.equal(ad.status,'Active');
 });
 test(`${name}: agency can send an approved ad back to Moderate`,async()=>{
  session={role:'agency',user_id:'agency',agency_id:'agency'};ad.status='Active';
  assert.equal((await run(name,'moderate')).code,200);assert.equal(ad.status,'Moderate');
 });
 test(`${name}: concurrent moderation decision is never overwritten by a stale client update`,async()=>{
  ad.status='On Hold';race='Moderate';assert.equal((await run(name,'active')).code,409);assert.equal(ad.status,'Moderate');assert.equal(writes.length,0);
 });
}
test('client can edit content while pending without changing status',async()=>{
 assert.equal((await run('campaign',undefined)).code,200);assert.equal(ad.status,'Moderate');
});
test('approving status does not clear the ad schedule or end date',async()=>{
 session={role:'agency',user_id:'agency',agency_id:'agency'};
 assert.equal((await run('campaigns-status','active')).code,200);assert.equal(ad.schedule_enabled,true);assert.equal(ad.end_date,'2026-12-01');
});
const componentBuild=await build({entryPoints:['src/components/AdStatusControl.tsx'],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic'});
const {default:Control}=await import(`data:text/javascript;base64,${Buffer.from(componentBuild.outputFiles[0].text).toString('base64')}`);
test('pending client sees a moderation notice and no status choices',()=>{
 const html=renderToStaticMarkup(createElement(Control,{role:'client',value:'moderate',onChange(){}}));
 assert.ok(html.includes('на модерации'));assert.ok(!html.includes('type="radio"'));assert.ok(!html.includes('Active'));
});
test('only agency sees Moderate as a selectable status',()=>{
 const client=renderToStaticMarkup(createElement(Control,{role:'client',value:'active',onChange(){}}));assert.ok(!client.includes('Moderate'));
 const agency=renderToStaticMarkup(createElement(Control,{role:'agency',value:'moderate',onChange(){}}));assert.ok(agency.includes('Active'));assert.ok(agency.includes('Moderate'));assert.ok(!agency.includes('On Hold'));
});
test.after(()=>delete globalThis.__moderation);
