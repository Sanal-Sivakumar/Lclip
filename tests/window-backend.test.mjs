import test from "node:test";
import assert from "node:assert/strict";
import { selectWindowBackend } from "../src/main/window-backend.mjs";

test("Wayland sessions prefer the movable Xwayland window backend when available", () => {
  assert.equal(selectWindowBackend({
    platform: "linux",
    env: { XDG_SESSION_TYPE: "wayland", WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":0" }
  }).useXwayland, true);

  assert.equal(selectWindowBackend({
    platform: "linux",
    env: { XDG_SESSION_TYPE: "wayland", WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":0", LCLIP_NATIVE_WAYLAND: "1" }
  }).useXwayland, false);

  assert.equal(selectWindowBackend({
    platform: "linux",
    env: { XDG_SESSION_TYPE: "x11", DISPLAY: ":0" }
  }).useXwayland, false);

  assert.equal(selectWindowBackend({
    platform: "darwin",
    env: { XDG_SESSION_TYPE: "wayland", DISPLAY: ":0" }
  }).useXwayland, false);
});
