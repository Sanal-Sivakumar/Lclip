#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This smoke test must run inside the Linux graphical session being validated." >&2
  exit 1
fi

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0
pass() { PASS_COUNT=$((PASS_COUNT + 1)); printf 'PASS  %s\n' "$1"; }
warn() { WARN_COUNT=$((WARN_COUNT + 1)); printf 'WARN  %s\n' "$1"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); printf 'FAIL  %s\n' "$1"; }

printf 'LClip Linux desktop smoke test\n'
printf 'Session: %s · Desktop: %s · Display: %s · Wayland: %s\n\n' \
  "${XDG_SESSION_TYPE:-unknown}" "${XDG_CURRENT_DESKTOP:-unknown}" "${DISPLAY:-none}" "${WAYLAND_DISPLAY:-none}"

PORTABLE_PREFIX="${LCLIP_PREFIX:-$HOME/.local}"
if [[ -x /opt/lclip/lclip ]]; then
  RUNTIME_EXECUTABLE=/opt/lclip/lclip
  BUILD_MARKER=/opt/lclip/resources/LCLIP_BUILD
elif [[ -x "$PORTABLE_PREFIX/opt/lclip/lclip" ]]; then
  RUNTIME_EXECUTABLE="$PORTABLE_PREFIX/opt/lclip/lclip"
  BUILD_MARKER="$PORTABLE_PREFIX/opt/lclip/resources/LCLIP_PORTABLE_INSTALL"
else
  RUNTIME_EXECUTABLE=""
  BUILD_MARKER=""
fi
if [[ -n "$RUNTIME_EXECUTABLE" ]]; then pass "Packaged executable is installed: $RUNTIME_EXECUTABLE"; else fail "No system or per-user packaged executable was found"; fi

if [[ -x /usr/local/bin/lclip ]]; then
  LCLIP_LAUNCHER=/usr/local/bin/lclip
elif [[ -x "$PORTABLE_PREFIX/bin/lclip" ]]; then
  LCLIP_LAUNCHER="$PORTABLE_PREFIX/bin/lclip"
else
  LCLIP_LAUNCHER="$(command -v lclip 2>/dev/null || true)"
fi
if [[ -n "$LCLIP_LAUNCHER" ]]; then pass "Launcher is installed: $LCLIP_LAUNCHER"; else fail "No LClip launcher was found"; fi

if [[ -n "$BUILD_MARKER" && -f "$BUILD_MARKER" ]]; then
  pass "Build marker: $(tr -d '\n' <"$BUILD_MARKER")"
else
  warn "Build marker is missing"
fi
if [[ -f "$HOME/.config/autostart/io.lclip.LClip.desktop" ]] && grep -q '^Hidden=false$' "$HOME/.config/autostart/io.lclip.LClip.desktop"; then
  pass "Per-user login autostart is enabled"
else
  warn "Per-user login autostart is missing or disabled"
fi

BRIDGE=""
for candidate in ydotool wtype xdotool; do
  if command -v "$candidate" >/dev/null 2>&1; then BRIDGE="$candidate"; break; fi
done
if [[ -n "$BRIDGE" ]]; then pass "Automatic-paste bridge available: $BRIDGE"; else warn "No automatic-paste bridge found; copy-only fallback will be tested"; fi

if [[ "${XDG_CURRENT_DESKTOP^^}" == *GNOME* ]] && command -v gsettings >/dev/null 2>&1; then
  GNOME_TARGET="org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/lclip/"
  GNOME_COMMAND="$(gsettings get "$GNOME_TARGET" command 2>/dev/null | tr -d "'" || true)"
  GNOME_BINDING="$(gsettings get "$GNOME_TARGET" binding 2>/dev/null | tr -d "'" || true)"
  if gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings | grep -q '/lclip/' \
    && [[ -n "$LCLIP_LAUNCHER" && "$GNOME_COMMAND" == "$LCLIP_LAUNCHER --show" ]] \
    && [[ "$GNOME_BINDING" == "<Super>period" ]]; then
    pass "GNOME native shortcut has the exact LClip command and Super + . binding"
  else
    warn "GNOME native shortcut is missing or differs; inspect the separate Electron/portal status in Settings"
  fi
fi

if [[ -n "$RUNTIME_EXECUTABLE" ]] && pgrep -f -- "$RUNTIME_EXECUTABLE" >/dev/null 2>&1; then
  pass "Resident LClip process is running"
elif [[ -n "$LCLIP_LAUNCHER" ]]; then
  "$LCLIP_LAUNCHER" --hidden >"${TMPDIR:-/tmp}/lclip-smoke-startup.log" 2>&1 &
  sleep 1
  if [[ -n "$RUNTIME_EXECUTABLE" ]] && pgrep -f -- "$RUNTIME_EXECUTABLE" >/dev/null 2>&1; then pass "Resident process started"; else fail "Resident process did not start; inspect ${TMPDIR:-/tmp}/lclip-smoke-startup.log"; fi
fi

ask() {
  local prompt="$1"
  local answer
  read -r -p "$prompt [y/n/s]: " answer
  case "${answer,,}" in
    y|yes) pass "$prompt" ;;
    n|no) fail "$prompt" ;;
    *) warn "$prompt (skipped)" ;;
  esac
}

if [[ -t 0 ]]; then
  printf '\nManual checks\n'
  printf 'Use a normal text editor as the target application. These checks require real compositor focus behavior.\n'
  ask "Super + . opens LClip globally"
  ask "Every fresh opening starts on Clipboard History with search cleared"
  ask "The clear strip above Search drags the window"
  ask "Copying two unique text values records both without duplicates"
  if [[ -n "$BRIDGE" ]]; then
    ask "Selecting the older value pastes it into the editor and reopens LClip"
  else
    ask "Selecting a value copies it and clearly requests manual Ctrl+V"
  fi
  ask "Emoji search plus Enter inserts the selected emoji"
  ask "Escape and focus loss dismiss the picker"
else
  warn "Interactive compositor checks skipped because stdin is not a terminal"
fi

printf '\nResult: %d passed · %d warnings · %d failed\n' "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT"
if [[ "$FAIL_COUNT" -gt 0 ]]; then exit 1; fi
