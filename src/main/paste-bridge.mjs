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

  if (ydotool) return { id: "ydotool", command: ydotool, label: "Automatic paste · ydotool", automatic: true };
  if (session === "wayland" && wtype) return { id: "wtype", command: wtype, label: "Automatic paste · Wayland", automatic: true };
  if (xdotool) return { id: "xdotool", command: xdotool, label: session === "wayland" ? "Automatic paste · Xwayland" : "Automatic paste · X11", automatic: true };
  return { id: "unavailable", label: "Copy only · input bridge missing", automatic: false };
}

export async function pasteWithBridge(bridge) {
  if (!bridge?.automatic || !bridge.command) return false;
  const options = { timeout: 2500, windowsHide: true };
  try {
    if (bridge.id === "ydotool") {
      await run(bridge.command, ["key", "29:1", "47:1", "47:0", "29:0"], options);
    } else if (bridge.id === "wtype") {
      await run(bridge.command, ["-M", "ctrl", "v", "-m", "ctrl"], options);
    } else if (bridge.id === "xdotool") {
      await run(bridge.command, ["key", "--clearmodifiers", "ctrl+v"], options);
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
