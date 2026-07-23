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
if [[ "$CONFIGURE_YDOTOOL" -eq 1 && "${EUID}" -eq 0 ]]; then
  echo "Run this installer as the desktop user without sudo; it will request sudo when needed." >&2
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
rm -rf "$PROJECT_DIR/dist"
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

stop_running_lclip() {
  echo "Stopping the currently running LClip instance…"
  pkill -TERM -x lclip 2>/dev/null || true
  pkill -TERM -f '^/opt/lclip/lclip( |$)' 2>/dev/null || true
  for _ in {1..30}; do
    if ! pgrep -f '^/opt/lclip/lclip( |$)' >/dev/null 2>&1; then return; fi
    sleep 0.1
  done
  pkill -KILL -f '^/opt/lclip/lclip( |$)' 2>/dev/null || true
}

SOURCE_REVISION="$(git -C "$PROJECT_DIR" rev-parse --short=12 HEAD 2>/dev/null || true)"
if [[ -z "$SOURCE_REVISION" ]]; then SOURCE_REVISION="v$(node -p 'require("./package.json").version')"; fi
BUILD_MARKER="$(mktemp)"
printf '%s\n' "$SOURCE_REVISION" >"$BUILD_MARKER"

INSTALL_PATH="/opt/lclip"
STAGED_PATH="/opt/lclip.new"
ROLLBACK_PATH="/opt/lclip.rollback"
HAD_PREVIOUS_INSTALL=0
ROLLBACK_ACTIVE=0

rollback_install() {
  local status="${1:-$?}"
  trap - ERR
  if [[ "$ROLLBACK_ACTIVE" -eq 1 ]]; then
    echo "Installation failed; restoring the previous LClip bundle…" >&2
    "${SUDO[@]}" rm -rf "$INSTALL_PATH"
    if [[ "$HAD_PREVIOUS_INSTALL" -eq 1 && -d "$ROLLBACK_PATH" ]]; then
      "${SUDO[@]}" mv "$ROLLBACK_PATH" "$INSTALL_PATH"
    fi
  fi
  "${SUDO[@]}" rm -rf "$STAGED_PATH"
  exit "$status"
}

echo "Staging LClip for a rollback-safe installation…"
"${SUDO[@]}" rm -rf "$STAGED_PATH" "$ROLLBACK_PATH"
"${SUDO[@]}" install -d -m 0755 "$STAGED_PATH" /usr/local/bin /usr/share/applications /usr/share/icons/hicolor/scalable/apps /etc/xdg/autostart
"${SUDO[@]}" cp -a "$BUNDLE"/. "$STAGED_PATH"/
"${SUDO[@]}" chown -R root:root "$STAGED_PATH"
if [[ -f "$STAGED_PATH/chrome-sandbox" ]]; then
  "${SUDO[@]}" chmod 4755 "$STAGED_PATH/chrome-sandbox"
fi
"${SUDO[@]}" install -m 0644 "$BUILD_MARKER" "$STAGED_PATH/resources/LCLIP_BUILD"
rm -f "$BUILD_MARKER"

stop_running_lclip

if [[ -d "$INSTALL_PATH" ]]; then
  "${SUDO[@]}" mv "$INSTALL_PATH" "$ROLLBACK_PATH"
  HAD_PREVIOUS_INSTALL=1
fi
if ! "${SUDO[@]}" mv "$STAGED_PATH" "$INSTALL_PATH"; then
  if [[ "$HAD_PREVIOUS_INSTALL" -eq 1 ]]; then "${SUDO[@]}" mv "$ROLLBACK_PATH" "$INSTALL_PATH"; fi
  echo "The staged LClip bundle could not be activated; the previous installation was restored." >&2
  exit 1
fi
ROLLBACK_ACTIVE=1
trap rollback_install ERR

LAUNCHER="$(mktemp)"
DESKTOP="$(mktemp)"
AUTOSTART="$(mktemp)"
trap 'rm -f "$LAUNCHER" "$DESKTOP" "$AUTOSTART"' EXIT

cat >"$LAUNCHER" <<'EOF'
#!/bin/sh
if [ "${XDG_SESSION_TYPE:-}" = "wayland" ] && [ -n "${DISPLAY:-}" ] && [ "${LCLIP_NATIVE_WAYLAND:-0}" != "1" ]; then
  exec /opt/lclip/lclip --ozone-platform=x11 "$@"
fi
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
  command -v ydotool >/dev/null || { echo "ydotool could not be installed from this distribution's repositories." >&2; rollback_install 1; }
  command -v ydotoold >/dev/null || install_bridge_package ydotoold || true
  command -v ydotoold >/dev/null || { echo "The ydotoold daemon could not be installed. Automatic ydotool paste is unavailable." >&2; rollback_install 1; }
  LOGIN_USER="${SUDO_USER:-${USER:-}}"
  [[ -n "$LOGIN_USER" && "$LOGIN_USER" != "root" ]] || { echo "Run this installer as the desktop user, not with sudo, to configure ydotool." >&2; rollback_install 1; }

  echo "Configuring restricted /dev/uinput access for $LOGIN_USER…"
  "${SUDO[@]}" groupadd --system --force lclip-uinput
  "${SUDO[@]}" usermod -aG lclip-uinput "$LOGIN_USER"
  UINPUT_RULE="$(mktemp)"
  cat >"$UINPUT_RULE" <<'EOF'
KERNEL=="uinput", GROUP="lclip-uinput", MODE="0660", OPTIONS+="static_node=uinput"
EOF
  "${SUDO[@]}" install -m 0644 "$UINPUT_RULE" /etc/udev/rules.d/80-lclip-uinput.rules
  rm -f "$UINPUT_RULE"
  printf 'uinput\n' | "${SUDO[@]}" tee /etc/modules-load.d/lclip-uinput.conf >/dev/null
  "${SUDO[@]}" modprobe uinput || true
  if command -v udevadm >/dev/null; then
    "${SUDO[@]}" udevadm control --reload-rules || true
    "${SUDO[@]}" udevadm trigger --name-match=uinput || true
  fi

  YDOTOOLD_PATH="$(command -v ydotoold)"
  USER_SERVICE_DIR="$HOME/.config/systemd/user"
  install -d -m 0700 "$USER_SERVICE_DIR"
  YDOTOOL_SERVICE="$(mktemp)"
  cat >"$YDOTOOL_SERVICE" <<EOF
[Unit]
Description=LClip ydotool input daemon
Documentation=https://github.com/ReimuNotMoe/ydotool
ConditionPathExists=/dev/uinput

[Service]
Type=simple
ExecStart=$YDOTOOLD_PATH
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
EOF
  install -m 0644 "$YDOTOOL_SERVICE" "$USER_SERVICE_DIR/lclip-ydotoold.service"
  rm -f "$YDOTOOL_SERVICE"
  if command -v systemctl >/dev/null; then
    systemctl --user daemon-reload || true
    systemctl --user enable lclip-ydotoold.service || true
    systemctl --user start lclip-ydotoold.service || true
  fi
  NEEDS_RELOGIN=1
fi

command -v update-desktop-database >/dev/null && "${SUDO[@]}" update-desktop-database /usr/share/applications || true
command -v gtk-update-icon-cache >/dev/null && "${SUDO[@]}" gtk-update-icon-cache -f /usr/share/icons/hicolor || true

ROLLBACK_ACTIVE=0
trap - ERR
"${SUDO[@]}" rm -rf "$ROLLBACK_PATH"

echo
echo "LClip is installed."
echo "  Application: /opt/lclip"
echo "  Command:     /usr/local/bin/lclip"
echo "  Shortcut:    Super + ."
echo "  Build:       $SOURCE_REVISION"
echo
if [[ "${EUID}" -ne 0 && ( -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ) ]]; then
  nohup /usr/local/bin/lclip --hidden >"${TMPDIR:-/tmp}/lclip-startup.log" 2>&1 &
  echo "The new resident LClip process has been started. Press Super + . to open it."
else
  echo "Start it now with: lclip --show"
fi
echo "LClip will start automatically after the next graphical login."
if [[ "$NEEDS_RELOGIN" -eq 1 ]]; then
  echo
  echo "IMPORTANT: Log out and back in before testing automatic paste."
  echo "The new lclip-uinput group membership is applied only to a new login session."
fi
