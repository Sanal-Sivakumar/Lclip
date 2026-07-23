import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const AUTOSTART_FILENAME = "io.lclip.LClip.desktop";

export function quoteDesktopExecArgument(value) {
  const text = String(value || "");
  if (!text || /[\r\n\0]/.test(text)) throw new Error("Autostart executable path is invalid");
  return `"${text.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("`", "\\`").replaceAll("$", "\\$")}"`;
}

export function buildAutostartEntry({ enabled, executable }) {
  if (!enabled) {
    return "[Desktop Entry]\nType=Application\nName=LClip\nHidden=true\n";
  }
  return `[Desktop Entry]
Type=Application
Version=1.0
Name=LClip
Comment=Keep the LClip global shortcut ready
Exec=${quoteDesktopExecArgument(executable)} --hidden
Icon=io.lclip.LClip
Terminal=false
NoDisplay=true
Hidden=false
X-GNOME-Autostart-enabled=true
X-KDE-autostart-after=panel
`;
}

export async function writeAutostartEntry({ home, enabled, executable }) {
  const directory = join(home, ".config", "autostart");
  const path = join(directory, AUTOSTART_FILENAME);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  await writeFile(path, buildAutostartEntry({ enabled, executable }), { mode: 0o600 });
  await chmod(path, 0o600);
  return path;
}
