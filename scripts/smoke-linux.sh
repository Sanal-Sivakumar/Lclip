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

if [[ -x /opt/lclip/lclip ]]; then pass "Packaged executable is installed"; else fail "/opt/lclip/lclip is missing"; fi
if [[ -x /usr/local/bin/lclip ]]; then pass "System launcher is installed"; else fail "/usr/local/bin/lclip is missing"; fi
if [[ -f /opt/lclip/resources/LCLIP_BUILD ]]; then
  pass "Build marker: $(tr -d '\n' </opt/lclip/resources/LCLIP_BUILD)"
else
  warn "Build marker is missing"
fi

BRIDGE=""
for candidate in ydotool wtype xdotool; do
  if command -v "$candidate" >/dev/null 2>&1; then BRIDGE="$candidate"; break; fi
done
if [[ -n "$BRIDGE" ]]; then pass "Automatic-paste bridge available: $BRIDGE"; else warn "No automatic-paste bridge found; copy-only fallback will be tested"; fi

if [[ "${XDG_CURRENT_DESKTOP^^}" == *GNOME* ]] && command -v gsettings >/dev/null 2>&1; then
  if gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings | grep -q '/lclip/'; then
    pass "GNOME native Super + . shortcut entry is present"
  else
    warn "GNOME native shortcut entry is missing; Electron portal registration may still work"
  fi
fi

if pgrep -f '^/opt/lclip/lclip( |$)' >/dev/null 2>&1; then
  pass "Resident LClip process is running"
elif [[ -x /usr/local/bin/lclip ]]; then
  /usr/local/bin/lclip --hidden >"${TMPDIR:-/tmp}/lclip-smoke-startup.log" 2>&1 &
  sleep 1
  if pgrep -f '^/opt/lclip/lclip( |$)' >/dev/null 2>&1; then pass "Resident process started"; else fail "Resident process did not start; inspect ${TMPDIR:-/tmp}/lclip-smoke-startup.log"; fi
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
