# LClip 1.0 production-readiness audit

## Decision

LClip 1.0 meets the repository's stable-release contract: the supported core has bounded and observable state, tested privilege boundaries, recoverable installation, native x86-64 and ARM64 packaging, runtime launch checks, checksums, and explicit desktop fallbacks. Stable does not erase Linux compositor policy differences; it makes those differences visible and keeps copying usable when shortcut or input automation is unavailable.

## Verified controls

- State is normalized, bounded, queued, written through a private temporary file and rename, and reports load or write failures rather than silently discarding them.
- Settings persists capture, GIF rating/key, and autostart through a tested IPC contract. Failed persistence restores the previous in-memory settings and per-user autostart entry.
- GIPHY searches cancel stale requests, cap response streams at 2 MB, accept validated HTTPS GIPHY assets only, and limit selected downloads to 15 MB with a 12-second timeout.
- The renderer is sandboxed and context-isolated, has Node integration disabled, uses a restrictive CSP, and exposes only named preload operations.
- History options and removal controls have separate semantic ownership. Search owns one listbox when options exist; Settings is a modal dialog; primary controls meet the 44px target.
- Settings independently reports Electron registration, Wayland portal routing, GNOME-native configuration, per-user startup, paste-bridge availability, and persistence.
- The no-root installer verifies release checksums, stages the portable archive, backs up user integration, and restores the prior installation after an activation failure.
- The source installer stages `/opt/lclip`, backs up shared and per-user integration, restores the previous bundle and resident process after required failures, and never runs the clipboard application as root.
- CI builds on native x86-64 and ARM64 Ubuntu runners. Each packaged runtime must report readiness, remain resident for five seconds, and shut down cleanly under Xvfb. Tagged releases add AppImage, Debian, RPM, and tar.gz artifacts, stable filenames, SHA-256 checksums, and provenance attestations.
- The historical `.venv/` payload was removed from every rewritten repository ref; the recovery bundle remains private and outside the repository.

## Local evidence

- `npm ci` completes from the committed lockfile.
- `npm run verify` covers state, persistence, autostart, IPC, release metadata, network bounds, shortcut status, paste bridges, window backend selection, and catalog data.
- `npm audit --audit-level=high` reports no known vulnerabilities at release preparation time.
- Workflow YAML, shell syntax, JavaScript syntax, Git whitespace checks, and rewritten-history integrity checks pass.
- Browser QA at 700×510 and 390×844 found no console warnings/errors, horizontal overflow, listbox ownership failures, or primary controls below 44px.

## Public release evidence

The authoritative build evidence is the `Verify LClip` workflow for the stable `main` commit and the `Release LClip` workflow for `v1.0.0`. Release assets and checksums must be inspected after those workflows complete; workflow URLs belong in the GitHub release and can also be recorded here without changing the immutable tag.

## Supported boundaries

- Supported binaries target current 64-bit glibc Linux on x86-64 and ARM64. Alpine/musl, 32-bit systems, and non-Linux hosts are outside the 1.0 binary support boundary.
- Clipboard history stores text only, is capped at 10 entries, and is filesystem-permission protected rather than encrypted.
- Automatic paste depends on compositor policy and an external bridge. Copy-first plus an explicit manual `Ctrl+V` instruction is stable supported behavior.
- GIF search requires a user-provided GIPHY key and a target that accepts an image, HTML, or URL clipboard representation.
- Prebuilt packages do not silently grant `/dev/uinput` access or install a GNOME custom shortcut. Those opt-in integrations use the guided source installer or manual desktop configuration.
- Headless Xvfb launch checks prove that native packaged runtimes start and remain resident; ongoing real GNOME, KDE, Wayland, and X11 observations are tracked separately in `docs/linux-smoke-test.md`.
