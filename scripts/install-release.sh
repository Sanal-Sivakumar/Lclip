#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY="${LCLIP_REPOSITORY:-Sanal-Sivakumar/Lclip}"
RELEASE_VERSION="${LCLIP_VERSION:-1.0.0}"
PREFIX="${LCLIP_PREFIX:-$HOME/.local}"
ENABLE_AUTOSTART=1

usage() {
  cat <<'EOF'
Install the official LClip portable Linux release for the current user.

Usage: ./install-lclip.sh [options]

Options:
  --release VERSION  Install a specific release (default: 1.0.0)
  --prefix PATH      Install below PATH (default: ~/.local)
  --no-autostart     Do not start LClip automatically after graphical login
  --help             Show this help

This installer needs no root access, Node.js, npm, or FUSE. It downloads the
architecture-matched tar.gz release, verifies SHA256SUMS, and rolls back an
existing per-user installation if activation fails.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release)
      [[ $# -ge 2 ]] || { echo "--release requires a version." >&2; exit 2; }
      RELEASE_VERSION="$2"
      shift 2
      ;;
    --prefix)
      [[ $# -ge 2 ]] || { echo "--prefix requires a path." >&2; exit 2; }
      PREFIX="$2"
      shift 2
      ;;
    --no-autostart) ENABLE_AUTOSTART=0; shift ;;
    --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$(uname -s)" == "Linux" ]] || { echo "LClip release installers run only on Linux." >&2; exit 1; }
[[ "$RELEASE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]] || { echo "Invalid release version: $RELEASE_VERSION" >&2; exit 2; }

case "$(uname -m)" in
  x86_64|amd64) RELEASE_ARCH="x64" ;;
  aarch64|arm64) RELEASE_ARCH="arm64" ;;
  *) echo "Unsupported architecture: $(uname -m). LClip publishes x86-64 and ARM64 builds." >&2; exit 1 ;;
esac

case "$PREFIX" in
  "$HOME"|"$HOME"/*) ;;
  *) echo "The per-user prefix must be inside $HOME." >&2; exit 2 ;;
esac
[[ "$PREFIX" != "$HOME" ]] || { echo "Use a subdirectory of $HOME as the prefix, such as $HOME/.local." >&2; exit 2; }
[[ "$PREFIX" != *$'\n'* && "$PREFIX" != *$'\r'* ]] || { echo "The prefix contains unsupported characters." >&2; exit 2; }

for command_name in mktemp tar sha256sum; do
  command -v "$command_name" >/dev/null || { echo "$command_name is required." >&2; exit 1; }
done
if command -v curl >/dev/null; then
  download() { curl --fail --location --silent --show-error --retry 3 --retry-delay 1 "$1" --output "$2"; }
elif command -v wget >/dev/null; then
  download() { wget --quiet --tries=3 --output-document="$2" "$1"; }
else
  echo "Install curl or wget, then run this installer again." >&2
  exit 1
fi

ARCHIVE_NAME="LClip-linux-${RELEASE_ARCH}.tar.gz"
ICON_NAME="LClip.svg"
RELEASE_BASE="https://github.com/${REPOSITORY}/releases/download/v${RELEASE_VERSION}"
WORK_DIR="$(mktemp -d)"
INSTALL_PARENT="$PREFIX/opt"
INSTALL_DIR="$INSTALL_PARENT/lclip"
NEW_DIR="$INSTALL_PARENT/lclip.new"
ROLLBACK_DIR="$INSTALL_PARENT/lclip.rollback"
BIN_DIR="$PREFIX/bin"
LAUNCHER="$BIN_DIR/lclip"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
DESKTOP_FILE="$DATA_HOME/applications/io.lclip.LClip.desktop"
ICON_FILE="$DATA_HOME/icons/hicolor/scalable/apps/io.lclip.LClip.svg"
AUTOSTART_FILE="$CONFIG_HOME/autostart/io.lclip.LClip.desktop"
BACKUP_DIR="$WORK_DIR/integration-backup"
ROLLBACK_ACTIVE=0
HAD_PREVIOUS_INSTALL=0
NEW_INSTALL_ACTIVATED=0
PREVIOUS_WAS_RUNNING=0

if [[ -d "$INSTALL_DIR" && ! -f "$INSTALL_DIR/resources/LCLIP_PORTABLE_INSTALL" ]]; then
  echo "Refusing to replace $INSTALL_DIR because it is not marked as an LClip portable installation." >&2
  exit 1
fi

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

backup_file() {
  local path="$1" key="$2"
  if [[ -e "$path" || -L "$path" ]]; then
    cp -a "$path" "$BACKUP_DIR/$key"
  else
    : >"$BACKUP_DIR/$key.absent"
  fi
}

restore_file() {
  local path="$1" key="$2"
  rm -f "$path"
  if [[ -e "$BACKUP_DIR/$key" || -L "$BACKUP_DIR/$key" ]]; then
    mkdir -p "$(dirname "$path")"
    cp -a "$BACKUP_DIR/$key" "$path"
  fi
}

rollback_install() {
  local status="${1:-$?}"
  trap - ERR
  set +e
  if [[ "$ROLLBACK_ACTIVE" -eq 1 ]]; then
    echo "Installation failed; restoring the previous per-user LClip installation…" >&2
    if [[ "$NEW_INSTALL_ACTIVATED" -eq 1 ]]; then rm -rf "$INSTALL_DIR"; fi
    if [[ "$HAD_PREVIOUS_INSTALL" -eq 1 && -d "$ROLLBACK_DIR" ]]; then mv "$ROLLBACK_DIR" "$INSTALL_DIR"; fi
    restore_file "$LAUNCHER" launcher
    restore_file "$DESKTOP_FILE" desktop
    restore_file "$ICON_FILE" icon
    restore_file "$AUTOSTART_FILE" autostart
    if [[ "$PREVIOUS_WAS_RUNNING" -eq 1 && -x "$LAUNCHER" && ( -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ) ]]; then
      nohup "$LAUNCHER" --hidden >"${TMPDIR:-/tmp}/lclip-user-rollback.log" 2>&1 &
    fi
  fi
  rm -rf "$NEW_DIR"
  exit "$status"
}

echo "Downloading LClip ${RELEASE_VERSION} for Linux ${RELEASE_ARCH}…"
download "$RELEASE_BASE/$ARCHIVE_NAME" "$WORK_DIR/$ARCHIVE_NAME"
download "$RELEASE_BASE/$ICON_NAME" "$WORK_DIR/$ICON_NAME"
download "$RELEASE_BASE/SHA256SUMS" "$WORK_DIR/SHA256SUMS"

grep -E "^[0-9a-fA-F]{64}  ${ARCHIVE_NAME//./\.}$" "$WORK_DIR/SHA256SUMS" >"$WORK_DIR/selected-checksums"
grep -E "^[0-9a-fA-F]{64}  ${ICON_NAME//./\.}$" "$WORK_DIR/SHA256SUMS" >>"$WORK_DIR/selected-checksums"
[[ "$(wc -l <"$WORK_DIR/selected-checksums" | tr -d ' ')" == "2" ]] || { echo "The release checksum manifest is incomplete." >&2; exit 1; }
(cd "$WORK_DIR" && sha256sum --check selected-checksums)

mkdir -p "$WORK_DIR/extracted" "$INSTALL_PARENT" "$BACKUP_DIR" "$BIN_DIR"
tar -xzf "$WORK_DIR/$ARCHIVE_NAME" -C "$WORK_DIR/extracted"
RUNTIME_EXECUTABLE="$(find "$WORK_DIR/extracted" -maxdepth 3 -type f -name lclip -perm -u+x -print -quit)"
[[ -n "$RUNTIME_EXECUTABLE" ]] || { echo "The portable archive does not contain an executable LClip runtime." >&2; exit 1; }
RUNTIME_ROOT="$(dirname "$RUNTIME_EXECUTABLE")"

rm -rf "$NEW_DIR" "$ROLLBACK_DIR"
mv "$RUNTIME_ROOT" "$NEW_DIR"
mkdir -p "$NEW_DIR/resources"
printf 'v%s\n' "$RELEASE_VERSION" >"$NEW_DIR/resources/LCLIP_PORTABLE_INSTALL"
chmod 0755 "$NEW_DIR/lclip"

mkdir -p "$(dirname "$DESKTOP_FILE")" "$(dirname "$ICON_FILE")" "$(dirname "$AUTOSTART_FILE")"
backup_file "$LAUNCHER" launcher
backup_file "$DESKTOP_FILE" desktop
backup_file "$ICON_FILE" icon
backup_file "$AUTOSTART_FILE" autostart

if pgrep -f -- "$INSTALL_DIR/lclip" >/dev/null 2>&1; then PREVIOUS_WAS_RUNNING=1; fi
ROLLBACK_ACTIVE=1
trap 'rollback_install $?' ERR
pkill -TERM -f -- "$INSTALL_DIR/lclip" >/dev/null 2>&1 || true

if [[ -d "$INSTALL_DIR" ]]; then
  mv "$INSTALL_DIR" "$ROLLBACK_DIR"
  HAD_PREVIOUS_INSTALL=1
fi
mv "$NEW_DIR" "$INSTALL_DIR"
NEW_INSTALL_ACTIVATED=1

printf '#!/bin/sh\nAPP=%q\nif [ "${XDG_SESSION_TYPE:-}" = "wayland" ] && [ -n "${DISPLAY:-}" ] && [ "${LCLIP_NATIVE_WAYLAND:-0}" != "1" ]; then\n  exec "$APP" --ozone-platform=x11 "$@"\nfi\nexec "$APP" "$@"\n' "$INSTALL_DIR/lclip" >"$LAUNCHER"
chmod 0755 "$LAUNCHER"
cp "$WORK_DIR/$ICON_NAME" "$ICON_FILE"
chmod 0644 "$ICON_FILE"

ESCAPED_LAUNCHER="${LAUNCHER//\\/\\\\}"
ESCAPED_LAUNCHER="${ESCAPED_LAUNCHER//\"/\\\"}"
cat >"$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=LClip
Comment=Clipboard history and expression picker
Exec="$ESCAPED_LAUNCHER" --show
Icon=io.lclip.LClip
Terminal=false
Categories=Utility;
Keywords=clipboard;emoji;kaomoji;gif;symbols;
StartupNotify=false
SingleMainWindow=true
X-LClip-Managed=true
EOF
chmod 0644 "$DESKTOP_FILE"

if [[ "$ENABLE_AUTOSTART" -eq 1 ]]; then
  cat >"$AUTOSTART_FILE" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=LClip
Comment=Keep the LClip global shortcut ready
Exec="$ESCAPED_LAUNCHER" --hidden
Icon=io.lclip.LClip
Terminal=false
NoDisplay=true
Hidden=false
X-GNOME-Autostart-enabled=true
X-KDE-autostart-after=panel
X-LClip-Managed=true
EOF
else
  cat >"$AUTOSTART_FILE" <<'EOF'
[Desktop Entry]
Type=Application
Name=LClip
Hidden=true
X-LClip-Managed=true
EOF
fi
chmod 0600 "$AUTOSTART_FILE"

command -v update-desktop-database >/dev/null && update-desktop-database "$(dirname "$DESKTOP_FILE")" >/dev/null 2>&1 || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -f "$DATA_HOME/icons/hicolor" >/dev/null 2>&1 || true

ROLLBACK_ACTIVE=0
trap - ERR
rm -rf "$ROLLBACK_DIR"

if [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]; then
  nohup "$LAUNCHER" --hidden >"${TMPDIR:-/tmp}/lclip-user-startup.log" 2>&1 &
fi

echo
echo "LClip ${RELEASE_VERSION} is installed for this user."
echo "  Application: $INSTALL_DIR"
echo "  Command:     $LAUNCHER"
echo "  Menu entry:  $DESKTOP_FILE"
echo "  Autostart:   $([[ "$ENABLE_AUTOSTART" -eq 1 ]] && echo enabled || echo disabled)"
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo "  PATH note: add $BIN_DIR to PATH to run 'lclip' from a terminal."
fi
echo "Open LClip from the application menu or press Super + . after shortcut registration succeeds."
