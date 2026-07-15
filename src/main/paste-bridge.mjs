import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { delimiter } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

async function executable(name, env = process.env) {
  for (const directory of String(env.PATH || "").split(delimiter)) {
    if (!directory) continue;
    const candidate = `${directory}/${name}`;
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  return "";
}

export async function detectPasteBridge(env = process.env, platform = process.platform) {
  if (platform !== "linux") return { id: "unavailable", label: "Linux installation required", automatic: false };
  const session = String(env.XDG_SESSION_TYPE || "").toLowerCase();
  const ydotool = await executable("ydotool", env);
  const wtype = await executable("wtype", env);
  const xdotool = await executable("xdotool", env);

  const candidates = [];
  if (ydotool) candidates.push({ id: "ydotool", command: ydotool, label: "Automatic paste · ydotool", automatic: true });
  if (session === "wayland" && wtype) candidates.push({ id: "wtype", command: wtype, label: "Automatic paste · Wayland", automatic: true });
  if (xdotool) candidates.push({ id: "xdotool", command: xdotool, label: session === "wayland" ? "Automatic paste · Xwayland" : "Automatic paste · X11", automatic: true });
  if (candidates.length) return { ...candidates[0], candidates };
  return { id: "unavailable", label: "Copy only · input bridge missing", automatic: false };
}

export async function pasteWithBridge(bridge) {
  if (!bridge?.automatic || !bridge.command) return false;
  const options = { timeout: 2500, windowsHide: true };
  for (const candidate of bridge.candidates || [bridge]) {
    try {
      if (candidate.id === "ydotool") {
        await run(candidate.command, ["key", "29:1", "47:1", "47:0", "29:0"], options);
      } else if (candidate.id === "wtype") {
        await run(candidate.command, ["-M", "ctrl", "v", "-m", "ctrl"], options);
      } else if (candidate.id === "xdotool") {
        await run(candidate.command, ["key", "--clearmodifiers", "ctrl+v"], options);
      } else {
        continue;
      }
      return true;
    } catch {
      // Try the next bridge. Wayland support varies by compositor and target app.
    }
  }
  return false;
}
