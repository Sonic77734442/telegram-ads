import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

let session;
let queryResult;
let queries;
globalThis.__accountTest = {
  session: () => session,
  db: {from(table) {queries.push(["from",table]); return {
    select(columns) {queries.push(["select",columns]); return this;},
    eq(column,value) {queries.push(["eq",column,value]); return this;},
    then(resolve) {return Promise.resolve(queryResult).then(resolve);},
    single() {return Promise.resolve(queryResult);},
    update() {throw new Error("GET must never mutate a balance");},
  };}},
};
const output = await build({
  entryPoints: ["api/campaigns-budget.ts"], bundle:true, write:false, platform:"node", format:"esm",
  plugins:[{name:"test-dependencies",setup(builder) {
    builder.onLoad({filter:/supabaseAdmin\.ts$/},()=>({loader:"js",contents:"export const getSupabaseAdmin=()=>globalThis.__accountTest.db;"}));
    builder.onLoad({filter:/auth-utils\.ts$/},()=>({loader:"js",contents:"export const readSessionFromRequest=()=>globalThis.__accountTest.session();"}));
  }}],
});
const {default: handler}=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
async function run(options={}) {
  const res={headers:{},status(code){this.code=code;return this;},json(body){this.body=body;return this;},setHeader(k,v){this.headers[k]=v;}};
  await handler({method:"GET",query:{client_id:"someone-else",agency_id:"other-agency"},...options},res);
  return res;
}
test.beforeEach(()=>{session={role:"client",user_id:"client-1",agency_id:"agency-1"};queryResult={data:[{balance:"2074"}],error:null};queries=[];});
test("client receives their deposited balance using only the signed session scope",async()=>{
  const res=await run();assert.equal(res.code,200);assert.equal(res.body.balance,2074);
  assert.deepEqual(queries,[["from","client_balances"],["select","balance, markup_percent"],["eq","client_id","client-1"]]);
  assert.equal(res.headers["Cache-Control"],"private, no-store");
});
test("agency receives only the sum within their agency",async()=>{
  session.role="agency";queryResult.data=[{balance:"2074"},{balance:"26.50"},{balance:null}];
  const res=await run();assert.equal(res.body.balance,2100.5);assert.deepEqual(queries.at(-1),["eq","agency_id","agency-1"]);
});
test("no session is rejected before querying",async()=>{session=null;assert.equal((await run()).code,401);assert.equal(queries.length,0);});
test("missing scope and unknown role are rejected",async()=>{
  session.user_id="";assert.equal((await run()).code,403);
  session.role="unexpected";assert.equal((await run()).code,403);assert.equal(queries.length,0);
});
test("empty account returns zero",async()=>{queryResult.data=[];assert.equal((await run()).body.balance,0);});
test("client markup is returned as a number for forms and statistics",async()=>{
  queryResult.data=[{balance:"2074",markup_percent:"4.5"}];
  assert.equal((await run()).body.markup_percent,4.5);
});
test("lookup failure does not masquerade as zero",async()=>{queryResult={data:null,error:{code:"08006"}};const res=await run();assert.equal(res.code,503);assert.ok(!("balance" in res.body));});
test("admin header keeps its existing zero without querying all accounts",async()=>{session.role="admin";assert.equal((await run()).body.balance,0);assert.equal(queries.length,0);});
test("POST still rejects editing another client's campaign",async()=>{
  queryResult.data={id:"ad",client_id:"someone-else",agency_id:"other"};
  assert.equal((await run({method:"POST",body:{ad_id:"ad",mode:"increase",amount:1}})).code,403);
});
test.after(()=>{delete globalThis.__accountTest;});
