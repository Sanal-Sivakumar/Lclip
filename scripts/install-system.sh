#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "LClip's system installer must be run on Linux." >&2
  exit 1
fi

command -v node >/dev/null || { echo "Node.js 22.12.0 or newer is required. The 'node' command was not found." >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required. The 'npm' command was not found." >&2; exit 1; }

NODE_VERSION="$(node -p 'process.versions.node' 2>/dev/null || true)"
IFS=. read -r NODE_MAJOR NODE_MINOR NODE_PATCH <<<"${NODE_VERSION:-0.0.0}"
NODE_MAJOR="${NODE_MAJOR:-0}"
NODE_MINOR="${NODE_MINOR:-0}"
if (( NODE_MAJOR < 22 || (NODE_MAJOR == 22 && NODE_MINOR < 12) )); then
  echo "LClip requires Node.js 22.12.0 or newer; found ${NODE_VERSION:-unknown}." >&2
  echo "Install Node.js 22, open a new terminal, and run this installer again." >&2
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_BRIDGE=0
CONFIGURE_YDOTOOL=0
for argument in "$@"; do
  case "$argument" in
    --skip-input-bridge) SKIP_BRIDGE=1 ;;
    --configure-ydotool) CONFIGURE_YDOTOOL=1 ;;
    --help)
      echo "Usage: ./scripts/install-system.sh [--configure-ydotool | --skip-input-bridge]"
      echo "  --configure-ydotool  Configure /dev/uinput access for automatic paste; logout required"
      echo "  --skip-input-bridge  Build and install LClip without installing paste tools"
      exit 0
      ;;
    *) echo "Unknown installer option: $argument" >&2; exit 1 ;;
  esac
done
if [[ "$SKIP_BRIDGE" -eq 1 && "$CONFIGURE_YDOTOOL" -eq 1 ]]; then
  echo "--configure-ydotool and --skip-input-bridge cannot be used together." >&2
  exit 1
fi

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
"${SUDO[@]}" chown -R root:root /opt/lclip
if [[ -f /opt/lclip/chrome-sandbox ]]; then
  "${SUDO[@]}" chmod 4755 /opt/lclip/chrome-sandbox
fi

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

DESKTOP_NAME="${XDG_CURRENT_DESKTOP:-}"
if [[ "${EUID}" -ne 0 && "${DESKTOP_NAME^^}" == *GNOME* ]] && command -v gsettings >/dev/null; then
  node "$PROJECT_DIR/scripts/configure-gnome-shortcut.mjs" || echo "GNOME shortcut setup failed; add /usr/local/bin/lclip --show in Keyboard Settings." >&2
fi

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
  if command -v systemctl >/dev/null; then
    if systemctl --user list-unit-files ydotool.service >/dev/null 2>&1; then
      systemctl --user enable --now ydotool.service || true
    elif systemctl --user list-unit-files ydotoold.service >/dev/null 2>&1; then
      systemctl --user enable --now ydotoold.service || true
    elif systemctl list-unit-files ydotool.service >/dev/null 2>&1; then
      "${SUDO[@]}" systemctl enable --now ydotool.service || true
    elif systemctl list-unit-files ydotoold.service >/dev/null 2>&1; then
      "${SUDO[@]}" systemctl enable --now ydotoold.service || true
    fi
  fi
fi

NEEDS_RELOGIN=0
if [[ "$CONFIGURE_YDOTOOL" -eq 1 ]]; then
  command -v ydotool >/dev/null || { echo "ydotool could not be installed from this distribution's repositories." >&2; exit 1; }
  LOGIN_USER="${SUDO_USER:-${USER:-}}"
  [[ -n "$LOGIN_USER" && "$LOGIN_USER" != "root" ]] || { echo "Run this installer as the desktop user, not with sudo, to configure ydotool." >&2; exit 1; }

  echo "Configuring restricted /dev/uinput access for $LOGIN_USER…"
  "${SUDO[@]}" groupadd --system --force lclip-uinput
  "${SUDO[@]}" usermod -aG lclip-uinput "$LOGIN_USER"
  UINPUT_RULE="$(mktemp)"
  cat >"$UINPUT_RULE" <<'EOF'
KERNEL=="uinput", GROUP="lclip-uinput", MODE="0660", OPTIONS+="static_node=uinput"
EOF
  "${SUDO[@]}" install -m 0644 "$UINPUT_RULE" /etc/udev/rules.d/80-lclip-uinput.rules
  rm -f "$UINPUT_RULE"
  "${SUDO[@]}" modprobe uinput || true
  if command -v udevadm >/dev/null; then
    "${SUDO[@]}" udevadm control --reload-rules || true
    "${SUDO[@]}" udevadm trigger --name-match=uinput || true
  fi
  NEEDS_RELOGIN=1
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
if [[ "$NEEDS_RELOGIN" -eq 1 ]]; then
  echo
  echo "IMPORTANT: Log out and back in before testing automatic paste."
  echo "The new lclip-uinput group membership is applied only to a new login session."
fi
