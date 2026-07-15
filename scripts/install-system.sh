#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "LClip's system installer must be run on Linux." >&2
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_BRIDGE=0
[[ "${1:-}" == "--skip-input-bridge" ]] && SKIP_BRIDGE=1

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=()
else
  command -v sudo >/dev/null || { echo "sudo is required for a system-wide install." >&2; exit 1; }
  SUDO=(sudo)
fi

echo "Building LClip…"
cd "$PROJECT_DIR"
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run verify
npm run pack:linux

case "$(uname -m)" in
  x86_64|amd64) EXPECTED_BUNDLE="$PROJECT_DIR/dist/linux-unpacked" ;;
  aarch64|arm64) EXPECTED_BUNDLE="$PROJECT_DIR/dist/linux-arm64-unpacked" ;;
  *) EXPECTED_BUNDLE="" ;;
esac
if [[ -n "$EXPECTED_BUNDLE" && -d "$EXPECTED_BUNDLE" ]]; then
  BUNDLE="$EXPECTED_BUNDLE"
else
  BUNDLE="$(find "$PROJECT_DIR/dist" -maxdepth 1 -type d -name 'linux*-unpacked' -print -quit)"
fi
[[ -n "$BUNDLE" ]] || { echo "The packaged Linux application was not found." >&2; exit 1; }

echo "Installing LClip in /opt/lclip…"
"${SUDO[@]}" rm -rf /opt/lclip.new
"${SUDO[@]}" install -d -m 0755 /opt/lclip.new /usr/local/bin /usr/share/applications /usr/share/icons/hicolor/scalable/apps /etc/xdg/autostart
"${SUDO[@]}" cp -a "$BUNDLE"/. /opt/lclip.new/
"${SUDO[@]}" rm -rf /opt/lclip
"${SUDO[@]}" mv /opt/lclip.new /opt/lclip

LAUNCHER="$(mktemp)"
DESKTOP="$(mktemp)"
AUTOSTART="$(mktemp)"
trap 'rm -f "$LAUNCHER" "$DESKTOP" "$AUTOSTART"' EXIT

cat >"$LAUNCHER" <<'EOF'
#!/bin/sh
exec /opt/lclip/lclip "$@"
EOF

cat >"$DESKTOP" <<'EOF'
[Desktop Entry]
Type=Application
Version=1.0
Name=LClip
Comment=Clipboard history and expression picker
Exec=/usr/local/bin/lclip --show
Icon=io.lclip.LClip
Terminal=false
Categories=Utility;
Keywords=clipboard;emoji;kaomoji;gif;symbols;
StartupNotify=false
SingleMainWindow=true
EOF

cat >"$AUTOSTART" <<'EOF'
[Desktop Entry]
Type=Application
Version=1.0
Name=LClip
Comment=Keep the LClip global shortcut ready
Exec=/usr/local/bin/lclip --hidden
Icon=io.lclip.LClip
Terminal=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
X-KDE-autostart-after=panel
OnlyShowIn=GNOME;KDE;XFCE;X-Cinnamon;MATE;LXQt;Unity;
EOF

"${SUDO[@]}" install -m 0755 "$LAUNCHER" /usr/local/bin/lclip
"${SUDO[@]}" install -m 0644 "$DESKTOP" /usr/share/applications/io.lclip.LClip.desktop
"${SUDO[@]}" install -m 0644 "$AUTOSTART" /etc/xdg/autostart/io.lclip.LClip.desktop
"${SUDO[@]}" install -m 0644 "$PROJECT_DIR/assets/io.lclip.LClip.svg" /usr/share/icons/hicolor/scalable/apps/io.lclip.LClip.svg

install_bridge_package() {
  local package="$1"
  if command -v apt-get >/dev/null && apt-cache show "$package" >/dev/null 2>&1; then
    "${SUDO[@]}" apt-get install -y "$package"
  elif command -v dnf >/dev/null && dnf -q info "$package" >/dev/null 2>&1; then
    "${SUDO[@]}" dnf install -y "$package"
  elif command -v pacman >/dev/null && pacman -Si "$package" >/dev/null 2>&1; then
    "${SUDO[@]}" pacman -S --needed --noconfirm "$package"
  elif command -v zypper >/dev/null && zypper --non-interactive info "$package" >/dev/null 2>&1; then
    "${SUDO[@]}" zypper --non-interactive install "$package"
  fi
}

if [[ "$SKIP_BRIDGE" -eq 0 ]]; then
  echo "Installing an available automatic-paste bridge…"
  command -v ydotool >/dev/null || install_bridge_package ydotool || true
  command -v wtype >/dev/null || install_bridge_package wtype || true
  command -v xdotool >/dev/null || install_bridge_package xdotool || true
  if command -v systemctl >/dev/null && systemctl list-unit-files ydotool.service >/dev/null 2>&1; then
    "${SUDO[@]}" systemctl enable --now ydotool.service || true
  fi
fi

command -v update-desktop-database >/dev/null && "${SUDO[@]}" update-desktop-database /usr/share/applications || true
command -v gtk-update-icon-cache >/dev/null && "${SUDO[@]}" gtk-update-icon-cache -f /usr/share/icons/hicolor || true

echo
echo "LClip is installed."
echo "  Application: /opt/lclip"
echo "  Command:     /usr/local/bin/lclip"
echo "  Shortcut:    Super + ."
echo
echo "Start it now with: lclip --show"
echo "LClip will start automatically after the next graphical login."
