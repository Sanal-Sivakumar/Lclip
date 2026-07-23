import test from "node:test";
import assert from "node:assert/strict";
import { detectClipboardSource, normalizeSourceName } from "../src/main/clipboard-source.mjs";

test("active X11 window class becomes the clipboard source", async () => {
  const source = await detectClipboardSource({
    platform: "linux",
    display: ":0",
    session: "x11",
    run: async () => ({ stdout: "firefox\n" })
  });
  assert.equal(source, "firefox");
});

test("Wayland source falls back to an honest unavailable label", async () => {
  const source = await detectClipboardSource({ platform: "linux", display: "", session: "wayland" });
  assert.equal(source, "Source unavailable on Wayland");
});

test("source labels are trimmed and bounded", () => {
  assert.equal(normalizeSourceName("  Visual   Studio Code  "), "Visual Studio Code");
  assert.equal(normalizeSourceName(""), "");
});
