#!/usr/bin/env bash
set -euo pipefail

PREFIX="${LCLIP_PREFIX:-$HOME/.local}"
PURGE_DATA=0

usage() {
  cat <<'EOF'
Remove the per-user portable LClip installation.

Usage: ./uninstall-lclip.sh [--prefix PATH] [--purge-data]

Clipboard history and settings are preserved unless --purge-data is supplied.
This script does not remove a system installation under /opt/lclip.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix) [[ $# -ge 2 ]] || { echo "--prefix requires a path." >&2; exit 2; }; PREFIX="$2"; shift 2 ;;
    --purge-data) PURGE_DATA=1; shift ;;
    --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$(uname -s)" == "Linux" ]] || { echo "This uninstaller runs only on Linux." >&2; exit 1; }
case "$PREFIX" in "$HOME"/*) ;; *) echo "The per-user prefix must be inside $HOME." >&2; exit 2 ;; esac

INSTALL_DIR="$PREFIX/opt/lclip"
LAUNCHER="$PREFIX/bin/lclip"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
DESKTOP_FILE="$DATA_HOME/applications/io.lclip.LClip.desktop"
ICON_FILE="$DATA_HOME/icons/hicolor/scalable/apps/io.lclip.LClip.svg"
AUTOSTART_FILE="$CONFIG_HOME/autostart/io.lclip.LClip.desktop"

if [[ -d "$INSTALL_DIR" && ! -f "$INSTALL_DIR/resources/LCLIP_PORTABLE_INSTALL" ]]; then
  echo "Refusing to remove $INSTALL_DIR because it is not marked as an LClip portable installation." >&2
  exit 1
fi

pkill -TERM -f -- "$INSTALL_DIR/lclip" >/dev/null 2>&1 || true
rm -rf "$INSTALL_DIR"
if [[ -f "$LAUNCHER" ]] && grep -Fq "$PREFIX/opt/lclip/lclip" "$LAUNCHER"; then rm -f "$LAUNCHER"; fi
if [[ -f "$DESKTOP_FILE" ]] && grep -q '^X-LClip-Managed=true$' "$DESKTOP_FILE"; then rm -f "$DESKTOP_FILE"; fi
if [[ -f "$AUTOSTART_FILE" ]] && grep -q '^X-LClip-Managed=true$' "$AUTOSTART_FILE"; then rm -f "$AUTOSTART_FILE"; fi
rm -f "$ICON_FILE"

command -v update-desktop-database >/dev/null && update-desktop-database "$(dirname "$DESKTOP_FILE")" >/dev/null 2>&1 || true

DESKTOP_NAME="${XDG_CURRENT_DESKTOP:-}"
if [[ "${DESKTOP_NAME^^}" == *GNOME* ]] && command -v gsettings >/dev/null 2>&1; then
  ROOT_SCHEMA="org.gnome.settings-daemon.plugins.media-keys"
  BINDING_SCHEMA="org.gnome.settings-daemon.plugins.media-keys.custom-keybinding"
  BINDING_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/lclip/"
  CURRENT_BINDINGS="$(gsettings get "$ROOT_SCHEMA" custom-keybindings 2>/dev/null || echo "@as []")"
  EXISTING_PATHS="$(grep -o "'[^']*'" <<<"$CURRENT_BINDINGS" | tr -d "'" || true)"

  NEXT_BINDINGS=()
  for path in $EXISTING_PATHS; do
    if [[ "$path" != "$BINDING_PATH" ]]; then
      NEXT_BINDINGS+=("'$path'")
    fi
  done
  if [[ ${#NEXT_BINDINGS[@]} -eq 0 ]]; then
    SERIALIZED="@as []"
  else
    SERIALIZED="[$(printf "%s, " "${NEXT_BINDINGS[@]}" | sed 's/, $//')]"
  fi
  gsettings set "$ROOT_SCHEMA" custom-keybindings "$SERIALIZED" 2>/dev/null || true
  gsettings reset-recursively "$BINDING_SCHEMA:$BINDING_PATH" 2>/dev/null || true
fi

if [[ "$PURGE_DATA" -eq 1 ]]; then rm -rf "$CONFIG_HOME/LClip"; fi

echo "The per-user LClip installation was removed."
if [[ "$PURGE_DATA" -eq 0 ]]; then echo "Clipboard history and settings remain in $CONFIG_HOME/LClip."; fi
