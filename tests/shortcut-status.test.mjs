import test from "node:test";
import assert from "node:assert/strict";
import { buildShortcutStatus, detectGnomeNativeShortcut } from "../src/main/shortcut-status.mjs";

test("shortcut status distinguishes X11, Xwayland, portal, and GNOME native paths", () => {
  const gnome = { supported: true, configured: true, label: "GNOME native shortcut active" };
  const xwayland = buildShortcutStatus({ electronRegistered: false, platform: "linux", env: { XDG_SESSION_TYPE: "wayland" }, windowBackend: { useXwayland: true }, gnome });
  assert.equal(xwayland.active, true);
  assert.equal(xwayland.electron.route, "Electron through Xwayland");
  assert.equal(xwayland.portal.requested, false);
  assert.equal(xwayland.gnome.configured, true);

  const portal = buildShortcutStatus({ electronRegistered: true, platform: "linux", env: { XDG_SESSION_TYPE: "wayland" }, windowBackend: { useXwayland: false }, gnome: { supported: false, configured: false, label: "Not a GNOME session" } });
  assert.equal(portal.portal.requested, true);
  assert.equal(portal.portal.active, true);
  assert.equal(portal.electron.route, "Electron through Wayland portal");
});

test("GNOME native detection verifies the exact command and binding", async () => {
  const run = async (_command, args) => {
    if (args.at(-1) === "custom-keybindings") return { stdout: "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/lclip/']" };
    if (args.at(-1) === "command") return { stdout: "'/usr/local/bin/lclip --show'" };
    return { stdout: "'<Super>period'" };
  };
  const result = await detectGnomeNativeShortcut({ platform: "linux", env: { XDG_CURRENT_DESKTOP: "GNOME" }, run });
  assert.equal(result.configured, true);
  assert.equal(result.label, "GNOME native shortcut active");
});
