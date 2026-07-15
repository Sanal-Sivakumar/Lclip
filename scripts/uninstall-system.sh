#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then SUDO=(); else SUDO=(sudo); fi
pkill -x lclip 2>/dev/null || true
"${SUDO[@]}" rm -rf /opt/lclip
"${SUDO[@]}" rm -f /usr/local/bin/lclip
"${SUDO[@]}" rm -f /usr/share/applications/io.lclip.LClip.desktop
"${SUDO[@]}" rm -f /usr/share/icons/hicolor/scalable/apps/io.lclip.LClip.svg
"${SUDO[@]}" rm -f /etc/xdg/autostart/io.lclip.LClip.desktop
rm -f "${HOME}/.config/autostart/io.lclip.LClip.desktop"
echo "LClip was removed. User clipboard history remains under ~/.config/LClip unless you delete it manually."
