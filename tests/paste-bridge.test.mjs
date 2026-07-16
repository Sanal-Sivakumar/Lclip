import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectPasteBridge, pasteWithBridge } from "../src/main/paste-bridge.mjs";

async function fakeExecutable(directory, name, exitCode = 0) {
  const path = join(directory, name);
  await writeFile(path, `#!/bin/sh\nexit ${exitCode}\n`);
  await chmod(path, 0o755);
  return path;
}

async function fakeLegacyYdotool(directory) {
  const path = join(directory, "ydotool");
  await writeFile(path, `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "ydotool 0.1.8"
  exit 0
fi
if [ "$1" = "key" ] && [ "$2" = "--help" ]; then
  echo "Press keys such as ctrl+alt+f1"
  exit 0
fi
if [ "$1" = "key" ] && [ "$2" = "ctrl+v" ]; then
  exit 0
fi
exit 1
`);
  await chmod(path, 0o755);
  return path;
}

async function fakeModernYdotool(directory) {
  const path = join(directory, "ydotool");
  await writeFile(path, `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "ydotool v1.0.4"
  exit 0
fi
if [ "$1" = "key" ] && [ "$2" = "29:1" ] && [ "$3" = "47:1" ] && [ "$4" = "47:0" ] && [ "$5" = "29:0" ]; then
  exit 0
fi
exit 1
`);
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

test("paste falls back when the preferred bridge fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-"));
  await fakeExecutable(directory, "ydotool", 1);
  await fakeExecutable(directory, "wtype", 0);
  const bridge = await detectPasteBridge({ PATH: directory, XDG_SESSION_TYPE: "wayland" }, "linux");
  assert.equal(await pasteWithBridge(bridge), true);
});

test("ydotool 0.x uses symbolic ctrl+v instead of numeric key events", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-"));
  await fakeLegacyYdotool(directory);
  const bridge = await detectPasteBridge({ PATH: directory, XDG_SESSION_TYPE: "wayland" }, "linux");
  assert.equal(bridge.syntax, "legacy-symbolic");
  assert.equal(await pasteWithBridge(bridge), true);
});

test("ydotool 1.x uses explicit keycode press and release events", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-"));
  await fakeModernYdotool(directory);
  const bridge = await detectPasteBridge({ PATH: directory, XDG_SESSION_TYPE: "wayland" }, "linux");
  assert.equal(bridge.syntax, "keycodes");
  assert.equal(await pasteWithBridge(bridge), true);
});
