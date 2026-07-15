import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectPasteBridge } from "../src/main/paste-bridge.mjs";

async function fakeExecutable(directory, name) {
  const path = join(directory, name);
  await writeFile(path, "#!/bin/sh\nexit 0\n");
  await chmod(path, 0o755);
  return path;
}

test("ydotool is preferred for a Wayland session", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-"));
  await fakeExecutable(directory, "ydotool");
  await fakeExecutable(directory, "wtype");
  const bridge = await detectPasteBridge({ PATH: directory, XDG_SESSION_TYPE: "wayland" }, "linux");
  assert.equal(bridge.id, "ydotool");
  assert.equal(bridge.automatic, true);
});

test("wtype is used when Wayland has no ydotool", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-"));
  await fakeExecutable(directory, "wtype");
  const bridge = await detectPasteBridge({ PATH: directory, XDG_SESSION_TYPE: "wayland" }, "linux");
  assert.equal(bridge.id, "wtype");
});

test("missing bridge is reported honestly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-"));
  const bridge = await detectPasteBridge({ PATH: directory, XDG_SESSION_TYPE: "wayland" }, "linux");
  assert.equal(bridge.id, "unavailable");
  assert.equal(bridge.automatic, false);
});
