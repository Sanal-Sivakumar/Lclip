import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

function unavailableLabel(session) {
  return String(session).toLowerCase() === "wayland"
    ? "Source unavailable on Wayland"
    : "Source unavailable";
}

export function normalizeSourceName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
  return name || "";
}

export async function detectClipboardSource({
  platform = process.platform,
  display = process.env.DISPLAY,
  session = process.env.XDG_SESSION_TYPE,
  run = execFile
} = {}) {
  if (platform !== "linux" || !display) return unavailableLabel(session);
  try {
    const { stdout } = await run("xdotool", ["getactivewindow", "getwindowclassname"], {
      encoding: "utf8",
      timeout: 180,
      windowsHide: true
    });
    return normalizeSourceName(stdout) || unavailableLabel(session);
  } catch {
    return unavailableLabel(session);
  }
}
