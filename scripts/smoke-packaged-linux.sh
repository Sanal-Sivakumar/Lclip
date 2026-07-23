#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "The packaged runtime smoke test must run on Linux." >&2
  exit 1
fi

BUNDLE_DIR="${1:-}"
[[ -n "$BUNDLE_DIR" && -d "$BUNDLE_DIR" ]] || { echo "Usage: $0 /path/to/linux-unpacked" >&2; exit 2; }
EXECUTABLE="$BUNDLE_DIR/lclip"
[[ -x "$EXECUTABLE" ]] || { echo "Packaged executable is missing: $EXECUTABLE" >&2; exit 1; }
command -v timeout >/dev/null || { echo "timeout is required." >&2; exit 1; }
command -v xvfb-run >/dev/null || { echo "xvfb-run is required." >&2; exit 1; }

LOG_FILE="$(mktemp)"
cleanup() { rm -f "$LOG_FILE"; }
trap cleanup EXIT

set +e
if command -v dbus-run-session >/dev/null; then
  timeout --signal=TERM --kill-after=3s 12s dbus-run-session -- xvfb-run -a "$EXECUTABLE" --no-sandbox --show >"$LOG_FILE" 2>&1
else
  timeout --signal=TERM --kill-after=3s 12s xvfb-run -a "$EXECUTABLE" --no-sandbox --show >"$LOG_FILE" 2>&1
fi
STATUS=$?
set -e

if [[ "$STATUS" -ne 124 ]]; then
  echo "The packaged application exited before the 12-second residency check (status $STATUS)." >&2
  cat "$LOG_FILE" >&2
  exit 1
fi
if grep -Eiq '(^|[^a-z])(fatal|segmentation fault|uncaught exception|failed to load app)([^a-z]|$)' "$LOG_FILE"; then
  echo "The packaged application logged a fatal startup error." >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

echo "Packaged LClip remained alive for the Linux Xvfb runtime smoke window."
