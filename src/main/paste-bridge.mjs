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

async function ydotoolSyntax(command) {
  let output = "";
  for (const args of [["--version"], ["key", "--help"]]) {
    try {
      const result = await run(command, args, { timeout: 1200, windowsHide: true });
      output += `\n${result.stdout || ""}\n${result.stderr || ""}`;
    } catch (error) {
      output += `\n${error?.stdout || ""}\n${error?.stderr || ""}`;
    }
  }
  const version = output.match(/(?:^|\s)v?(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (version) return Number(version[1]) >= 1 ? "keycodes" : "legacy-symbolic";
  if (/KEYCODE\s*:\s*PRESSED|keycodes?/i.test(output)) return "keycodes";
  return "legacy-symbolic";
}

export async function detectPasteBridge(env = process.env, platform = process.platform) {
  if (platform !== "linux") return { id: "unavailable", label: "Linux installation required", automatic: false };
  const session = String(env.XDG_SESSION_TYPE || "").toLowerCase();
  const ydotool = await executable("ydotool", env);
  const wtype = await executable("wtype", env);
  const xdotool = await executable("xdotool", env);

  const candidates = [];
  if (ydotool) {
    const syntax = await ydotoolSyntax(ydotool);
    candidates.push({
      id: "ydotool",
      command: ydotool,
      syntax,
      label: syntax === "legacy-symbolic" ? "Automatic paste · ydotool 0.x" : "Automatic paste · ydotool",
      automatic: true
    });
  }
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
        const keys = candidate.syntax === "legacy-symbolic"
          ? ["key", "ctrl+v"]
          : ["key", "29:1", "47:1", "47:0", "29:0"];
        await run(candidate.command, keys, options);
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
