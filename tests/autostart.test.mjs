import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAutostartEntry, quoteDesktopExecArgument, writeAutostartEntry } from "../src/main/autostart.mjs";

test("autostart entries quote executable paths and preserve the hidden launch mode", () => {
  assert.equal(quoteDesktopExecArgument("/home/A User/LClip.AppImage"), '"/home/A User/LClip.AppImage"');
  assert.throws(() => quoteDesktopExecArgument("/tmp/bad\npath"), /invalid/);
  const entry = buildAutostartEntry({ enabled: true, executable: "/opt/lclip/lclip" });
  assert.match(entry, /Exec="\/opt\/lclip\/lclip" --hidden/);
  assert.match(entry, /Hidden=false/);
  assert.doesNotMatch(entry, /OnlyShowIn/, "XDG autostart must not exclude otherwise compatible desktops");
  assert.match(buildAutostartEntry({ enabled: false, executable: "/unused" }), /Hidden=true/);
});

test("autostart state is stored as a private per-user desktop entry", async () => {
  const home = await mkdtemp(join(tmpdir(), "lclip-autostart-"));
  const path = await writeAutostartEntry({ home, enabled: true, executable: "/opt/lclip/lclip" });
  assert.match(await readFile(path, "utf8"), /X-GNOME-Autostart-enabled=true/);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  await writeAutostartEntry({ home, enabled: false, executable: "/opt/lclip/lclip" });
  assert.match(await readFile(path, "utf8"), /Hidden=true/);
});
