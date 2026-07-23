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
  LCLIP_CI_SMOKE=1 timeout --signal=TERM --kill-after=3s 45s dbus-run-session -- xvfb-run -a "$EXECUTABLE" --no-sandbox --show >"$LOG_FILE" 2>&1
else
  LCLIP_CI_SMOKE=1 timeout --signal=TERM --kill-after=3s 45s xvfb-run -a "$EXECUTABLE" --no-sandbox --show >"$LOG_FILE" 2>&1
fi
STATUS=$?
set -e

if [[ "$STATUS" -ne 0 ]]; then
  echo "The packaged application did not complete its graceful startup smoke check (status $STATUS)." >&2
  cat "$LOG_FILE" >&2
  exit 1
fi
if ! grep -q '^LCLIP_CI_SMOKE_READY$' "$LOG_FILE"; then
  echo "The packaged application exited without reporting renderer/runtime readiness." >&2
  cat "$LOG_FILE" >&2
  exit 1
fi
if grep -Eiq '(^|[^a-z])(fatal|segmentation fault|uncaught exception|failed to load app)([^a-z]|$)' "$LOG_FILE"; then
  echo "The packaged application logged a fatal startup error." >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

echo "Packaged LClip reported readiness, remained resident for five seconds, and shut down cleanly under Xvfb."
