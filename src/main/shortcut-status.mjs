import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";

const runFile = promisify(execFile);
const ROOT_SCHEMA = "org.gnome.settings-daemon.plugins.media-keys";
const BINDING_SCHEMA = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding";
const BINDING_PATH = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/lclip/";

export async function detectGnomeNativeShortcut({ platform = process.platform, env = process.env, run = runFile, accessFile = access } = {}) {
  const supported = platform === "linux" && String(env.XDG_CURRENT_DESKTOP || "").toUpperCase().includes("GNOME");
  if (!supported) return { supported: false, configured: false, label: "Not a GNOME session" };
  try {
    const list = await run("gsettings", ["get", ROOT_SCHEMA, "custom-keybindings"], { encoding: "utf8", timeout: 1500 });
    if (!String(list.stdout || "").includes(BINDING_PATH)) return { supported: true, configured: false, label: "GNOME shortcut not configured" };
    const target = `${BINDING_SCHEMA}:${BINDING_PATH}`;
    const [command, binding] = await Promise.all([
      run("gsettings", ["get", target, "command"], { encoding: "utf8", timeout: 1500 }),
      run("gsettings", ["get", target, "binding"], { encoding: "utf8", timeout: 1500 })
    ]);
    const commandValue = String(command.stdout || "").replaceAll("'", "").trim();
    const bindingValue = String(binding.stdout || "").replaceAll("'", "").trim();
    const valuesMatch = commandValue === "/usr/local/bin/lclip --show" && bindingValue === "<Super>period";
    let executableExists = false;
    if (valuesMatch) {
      try {
        await accessFile("/usr/local/bin/lclip");
        executableExists = true;
      } catch {}
    }
    const configured = valuesMatch && executableExists;
    return {
      supported: true,
      configured,
      label: configured ? "GNOME native shortcut configured" : valuesMatch ? "GNOME shortcut command is missing" : "GNOME shortcut differs from the LClip binding"
    };
  } catch {
    return { supported: true, configured: false, label: "GNOME shortcut status unavailable" };
  }
}

export function buildShortcutStatus({ electronRegistered, platform = process.platform, env = process.env, windowBackend, gnome }) {
  const wayland = platform === "linux" && (env.XDG_SESSION_TYPE === "wayland" || Boolean(env.WAYLAND_DISPLAY));
  const useXwayland = Boolean(windowBackend?.useXwayland);
  const portalRequested = wayland && !useXwayland;
  const electronRoute = platform !== "linux"
    ? "Unsupported platform"
    : useXwayland
      ? "Electron through Xwayland"
      : portalRequested
        ? "Electron through Wayland portal"
        : "Electron through X11";
  return {
    active: Boolean(electronRegistered || gnome?.configured),
    electron: {
      registered: Boolean(electronRegistered),
      route: electronRoute,
      label: electronRegistered ? `${electronRoute} active` : `${electronRoute} unavailable`
    },
    portal: {
      requested: portalRequested,
      active: portalRequested && Boolean(electronRegistered),
      label: !wayland ? "Not required in this session" : useXwayland ? "Not used by the Xwayland window backend" : electronRegistered ? "Wayland portal registration active" : "Wayland portal unavailable or not approved"
    },
    gnome: gnome || { supported: false, configured: false, label: "Not a GNOME session" }
  };
}
