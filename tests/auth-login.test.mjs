import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import bcrypt from "bcryptjs";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "telegram-auth-test-"));
const output = await build({
  entryPoints: ["api/auth-login.ts"], bundle: true, write: false,
  platform: "node", format: "esm", packages: "bundle",
  plugins: [{name: "test-database", setup(builder) {
    builder.onLoad({filter: /supabaseAdmin\.ts$/}, () => ({
      contents: "export const getSupabaseAdmin = () => globalThis.__loginTestDb;",
      loader: "js",
    }));
  }}],
});
const modulePath = join(directory, "handler.mjs");
await writeFile(modulePath, output.outputFiles[0].text);
const {default: handler} = await import(pathToFileURL(modulePath));
process.env.AUTH_SECRET = "local-test-secret-never-used-in-production";
const hash = await bcrypt.hash(" exact-password ", 4);
let response = {data: {user_id:"test-client", role:"client", agency_id:"test-agency", password_hash:hash}, error:null};
let filter;
globalThis.__loginTestDb = {from() {return {select() {return {or(value) {
  filter=value; return {maybeSingle: async () => response};
}}}}}};
let ip = 0;
async function login(email, password) {
  const res = {headers:{}, status(value) {this.code=value; return this;}, json(value) {this.body=value; return this;}, setHeader(k,v) {this.headers[k]=v;}};
  await handler({method:"POST", headers:{"x-forwarded-for":`test-${++ip}`}, body:{email,password}},res);
  return res;
}
test("padded client login succeeds without changing password or account scope", async () => {
  const result = await login("  Asl Baraka / SAMO  ", " exact-password ");
  assert.equal(result.code, 200);
  assert.equal(filter, 'username.eq."Asl Baraka / SAMO",email.eq."Asl Baraka / SAMO"');
  assert.equal(result.body.user.user_id,"test-client");
  assert.equal(result.body.user.agency_id,"test-agency");
  assert.match(result.headers["Set-Cookie"],/HttpOnly/);
  assert.ok(!("password_hash" in result.body.user));
});
test("incorrect password still returns 401", async () => {
  assert.equal((await login("Asl Baraka / SAMO","exact-password")).code,401);
});
test("invalid login body returns 400", async () => {
  assert.equal((await login({},"x")).code,400);
  assert.equal((await login("   ","x")).code,400);
  assert.equal((await login("valid",{})).code,400);
});
test("missing user returns 401", async () => {
  response={data:null,error:null};
  assert.equal((await login("missing","x")).code,401);
});
test("database outage is not reported as a wrong password", async () => {
  response={data:null,error:{code:"08006"}};
  assert.equal((await login("valid","x")).code,503);
});
test.after(async () => {delete globalThis.__loginTestDb; await rm(directory,{recursive:true,force:true});});
