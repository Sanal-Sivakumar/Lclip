#!/usr/bin/env bash
set -euo pipefail

DOWNLOADS_ROOT="${1:-release/downloads}"
PUBLISH_ROOT="${2:-release/publish}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[[ -d "$DOWNLOADS_ROOT" ]] || { echo "Release download directory is missing: $DOWNLOADS_ROOT" >&2; exit 1; }
[[ ! -e "$PUBLISH_ROOT" ]] || { echo "Release publish directory already exists: $PUBLISH_ROOT" >&2; exit 1; }
command -v sha256sum >/dev/null || { echo "sha256sum is required to prepare release assets." >&2; exit 1; }

mkdir -p "$PUBLISH_ROOT"
for arch in x64 arm64; do
  source_dir="$DOWNLOADS_ROOT/lclip-linux-${arch}-installers"
  [[ -d "$source_dir" ]] || { echo "Missing installer directory for $arch: $source_dir" >&2; exit 1; }
  for extension in AppImage deb rpm tar.gz; do
    source_file="$(find "$source_dir" -type f -name "*.${extension}" -print -quit)"
    if [[ -z "$source_file" ]]; then
      echo "Missing ${extension} installer for ${arch}" >&2
      exit 1
    fi
    cp "$source_file" "$PUBLISH_ROOT/LClip-linux-${arch}.${extension}"
  done
done

cp "$PROJECT_ROOT/assets/io.lclip.LClip.svg" "$PUBLISH_ROOT/LClip.svg"
cp "$PROJECT_ROOT/scripts/install-release.sh" "$PUBLISH_ROOT/install-lclip.sh"
cp "$PROJECT_ROOT/scripts/uninstall-user.sh" "$PUBLISH_ROOT/uninstall-lclip.sh"
chmod 0755 "$PUBLISH_ROOT/install-lclip.sh" "$PUBLISH_ROOT/uninstall-lclip.sh"

(
  cd "$PUBLISH_ROOT"
  sha256sum LClip* install-lclip.sh uninstall-lclip.sh >SHA256SUMS
  for required in \
    LClip-linux-x64.AppImage LClip-linux-x64.deb LClip-linux-x64.rpm LClip-linux-x64.tar.gz \
    LClip-linux-arm64.AppImage LClip-linux-arm64.deb LClip-linux-arm64.rpm LClip-linux-arm64.tar.gz \
    LClip.svg install-lclip.sh uninstall-lclip.sh; do
    grep -Eq "^[0-9a-f]{64}  ${required//./\.}$" SHA256SUMS || {
      echo "Generated checksum manifest is missing $required" >&2
      exit 1
    }
  done
  [[ "$(wc -l <SHA256SUMS | tr -d ' ')" == "11" ]] || {
    echo "Generated checksum manifest must contain exactly 11 assets." >&2
    exit 1
  }
  sha256sum --check SHA256SUMS
)

echo "Prepared 11 checksummed LClip release assets in $PUBLISH_ROOT"
