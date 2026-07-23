# LClip production-readiness audit

## Current decision

LClip is an honest `1.0.0-beta.1` candidate, not a stable release. Its platform-neutral behavior, packaging inputs, failure visibility, accessibility structure, and release automation are ready for CI and real Linux qualification. Stable publication remains blocked until the evidence matrix in `docs/linux-smoke-test.md` is complete.

## Verified in the repository

- State is bounded, normalized, written through a private temporary file and rename, and reports load/write failures instead of silently discarding them.
- Settings persists capture, GIF, rating, and autostart state through a tested IPC contract. A failed save restores the prior user autostart file and in-memory settings.
- GIPHY search responses are cancelled when stale, capped at 2 MB, decoded only as JSON, and limited to validated HTTPS GIPHY assets. Selected images are streamed with a 15 MB cap and 12-second timeout.
- The renderer uses a sandboxed, context-isolated preload boundary with Node integration disabled and a restrictive CSP.
- History options and removal controls have separate semantic ownership; search owns exactly one listbox when options exist. The Settings sheet is a modal dialog and hides the underlying picker from assistive technology.
- Primary pointer controls are at least 44 px in the final 700×510 layout. Reduced-motion and increased-contrast modes are present.
- Settings distinguishes Electron registration, Wayland portal routing, exact GNOME-native configuration, per-user login startup, paste-bridge availability, and local persistence.
- The source installer stages a new bundle, backs up system integration, restores the previous installation after required failures, and records the installed revision. Operating-system packages installed as dependencies are intentionally not removed during rollback.
- CI and tagged releases use native x86-64 and ARM64 Ubuntu runners. Tags must match package metadata; releases publish AppImage, DEB, and RPM assets with stable filenames, `SHA256SUMS`, and provenance attestations.
- The historical `.venv/` payload is unreachable from every local ref after the documented rewrite; a private pre-rewrite recovery bundle exists outside the repository.

## Evidence collected locally

- `npm ci` completed from `package-lock.json`.
- `npm run verify` passes 30 automated tests plus syntax checks for runtime, preload, renderer, release, GNOME, and shell scripts.
- `npm audit --audit-level=high` reports zero vulnerabilities.
- Electron 43.2.0 and electron-builder 26.15.3 have no available direct dependency update in the current npm resolution.
- Electron Builder produced an unpacked ARM64 macOS application from the same ASAR inputs, including only the intended runtime source, assets, package metadata, and GPL license; that packaged application launched successfully. This validates packaging inputs, not Linux integration.
- Browser QA at 700×510 and 390×844 found no console warnings/errors, no horizontal overflow, correct modal/listbox ownership, and minimum primary control targets.

## Required before stable release

1. Complete the coordinated remote history update in `docs/history-rewrite.md`; no old branch or tag may retain `.venv/`.
2. Let CI build both native Linux architectures and inspect every uploaded unpacked artifact.
3. Install the tagged AppImage, DEB, and RPM artifacts as applicable and complete the GNOME Wayland, KDE Wayland, X11, and ARM64 evidence rows.
4. Exercise a forced installer failure and prove application, launcher, menu, icon, autostart, input-integration files, user service, and previous resident process are restored.
5. Verify checksums and GitHub attestations from independently downloaded release files.
6. Only then remove the prerelease suffix, update the changelog and direct links, and create a new immutable stable tag.

## Product boundaries that remain intentional

- Clipboard history stores text only, is capped at 10 entries, and is permission-protected but not encrypted.
- Automatic paste depends on compositor policy and a working external input bridge; copy-only fallback is a supported result.
- GIF search requires a user-provided GIPHY key and a target application that accepts an image, HTML, or URL clipboard representation.
- Tagged packages create per-user autostart but do not silently grant `/dev/uinput` access or install GNOME's native shortcut. Those opt-in integrations remain separate and visible in Settings.
- A browser preview or macOS run cannot prove Linux shortcut, portal, tray, autostart, focus handoff, drag, or synthetic-paste behavior.
