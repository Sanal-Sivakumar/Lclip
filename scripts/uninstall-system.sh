#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_NAME="${XDG_CURRENT_DESKTOP:-}"
if [[ "${EUID}" -ne 0 && "${DESKTOP_NAME^^}" == *GNOME* ]] && command -v node >/dev/null && command -v gsettings >/dev/null; then
  node "$PROJECT_DIR/scripts/configure-gnome-shortcut.mjs" --remove || true
fi

if command -v systemctl >/dev/null; then
  systemctl --user disable --now lclip-ydotoold.service >/dev/null 2>&1 || true
fi
rm -f "$HOME/.config/systemd/user/lclip-ydotoold.service"
command -v systemctl >/dev/null && systemctl --user daemon-reload >/dev/null 2>&1 || true

if [[ "${EUID}" -eq 0 ]]; then SUDO=(); else SUDO=(sudo); fi
LOGIN_USER="${SUDO_USER:-${USER:-}}"
pkill -x lclip 2>/dev/null || true
"${SUDO[@]}" rm -rf /opt/lclip
"${SUDO[@]}" rm -f /usr/local/bin/lclip
"${SUDO[@]}" rm -f /usr/share/applications/io.lclip.LClip.desktop
"${SUDO[@]}" rm -f /usr/share/icons/hicolor/scalable/apps/io.lclip.LClip.svg
"${SUDO[@]}" rm -f /etc/xdg/autostart/io.lclip.LClip.desktop
if [[ -f /etc/udev/rules.d/80-lclip-uinput.rules ]]; then
  "${SUDO[@]}" rm -f /etc/udev/rules.d/80-lclip-uinput.rules
  "${SUDO[@]}" rm -f /etc/modules-load.d/lclip-uinput.conf
  if [[ -n "$LOGIN_USER" && "$LOGIN_USER" != "root" ]] && getent group lclip-uinput >/dev/null; then
    "${SUDO[@]}" gpasswd -d "$LOGIN_USER" lclip-uinput >/dev/null 2>&1 || true
  fi
  if getent group lclip-uinput >/dev/null && [[ -z "$(getent group lclip-uinput | cut -d: -f4)" ]]; then
    "${SUDO[@]}" groupdel lclip-uinput || true
  fi
  command -v udevadm >/dev/null && "${SUDO[@]}" udevadm control --reload-rules || true
fi
rm -f "${HOME}/.config/autostart/io.lclip.LClip.desktop"
echo "LClip was removed. User clipboard history remains under ~/.config/LClip unless you delete it manually."
