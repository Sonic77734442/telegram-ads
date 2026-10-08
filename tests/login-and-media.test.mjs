import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLogin, loginFilter } from "../shared/login-input.ts";
import { createMediaPath } from "../src/utils/mediaPath.ts";

test("pasted login trims outer whitespace and preserves exact username", () => {
  assert.equal(normalizeLogin("  Asl Baraka / SAMO\n"), "Asl Baraka / SAMO");
  assert.equal(normalizeLogin("envidicy_agency"), "envidicy_agency");
  assert.equal(normalizeLogin(null), "");
  assert.equal(normalizeLogin({}), "");
});
test("login filters quote punctuation instead of interpreting it as filters", () => {
  assert.equal(loginFilter("a,b(c).d"), 'username.eq."a,b(c).d",email.eq."a,b(c).d"');
  const input = 'user"\\name';
  const literal = JSON.stringify(input);
  assert.equal(loginFilter(input), `username.eq.${literal},email.eq.${literal}`);
});
for (const [name, type, extension] of [
  ["Изображение ChatGPT 2 окт. 2026 г., 13_35_44.jpg", "image/jpeg", "jpg"],
  ["photo (final), 1.PNG", "image/png", "png"],
  ["ролик.mp4", "video/mp4", "mp4"],
  ["no extension", "image/webp", "webp"],
  ["../../image.jpg?token=secret", "", "bin"],
]) {
  test(`safe unique storage key for ${name}`, () => {
    const file = {name, type};
    const path = createMediaPath(file);
    assert.match(path, new RegExp(`^ads/[a-f0-9-]{36}\\.${extension}$`));
    assert.notEqual(path, createMediaPath(file));
    assert.ok(!path.includes(name));
  });
}
