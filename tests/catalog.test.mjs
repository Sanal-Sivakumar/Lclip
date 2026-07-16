import test from "node:test";
import assert from "node:assert/strict";
import { emoji, kaomoji, symbols } from "../src/renderer/catalog.js";

test("offline catalogs provide broad, searchable variety", () => {
  assert.ok(emoji.length >= 200, `expected at least 200 emoji, received ${emoji.length}`);
  assert.ok(kaomoji.length >= 60, `expected at least 60 kaomoji, received ${kaomoji.length}`);
  assert.ok(symbols.length >= 100, `expected at least 100 symbols, received ${symbols.length}`);

  for (const [name, catalog] of [["emoji", emoji], ["kaomoji", kaomoji], ["symbols", symbols]]) {
    assert.equal(new Set(catalog.map(item => item.value)).size, catalog.length, `${name} values must be unique`);
    assert.ok(catalog.every(item => item.value && item.name && item.category), `${name} items must be searchable and categorized`);
  }
});
