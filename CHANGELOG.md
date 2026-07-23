# Changelog

All notable LClip changes are documented here. The project follows semantic versioning and publishes immutable tagged releases.

## [1.0.0] - 2026-07-23

### Added

- Observable local-persistence status and actionable failure messages.
- Stream-bounded, cancellable GIPHY searches and downloads with redirect, host, and media-type validation.
- Testable Electron IPC registration and structured Electron, portal, GNOME-native, paste-bridge, and persistence diagnostics.
- Guided GNOME, KDE, Wayland, X11, and ARM64 smoke-test matrix.
- Per-user XDG autostart that works consistently for guided installs, AppImages, Debian packages, and RPM packages.
- Native x86-64 and ARM64 AppImage, Debian, RPM, and portable tar.gz release jobs with packaged-runtime launch checks, SHA-256 checksums, and build attestations.
- A checksum-verifying, rollback-safe no-root installer and matching per-user uninstaller for current 64-bit glibc Linux distributions.

### Changed

- The system installer stages replacements and restores the previous application, system-integration files, user service, and prior group membership when activation or required integration fails.
- History and expression results use repaired listbox semantics, active-descendant focus tracking, and 44 px minimum interactive targets.
- Landing-page product claims now distinguish current behavior from concept artwork and permission-dependent desktop integration.

### Validation status

- Automated syntax, state, persistence, IPC, release-contract, network-limit, shortcut-status, paste-bridge, backend, and catalog tests pass.
- Native x86-64 and ARM64 CI builds must launch the packaged runtime under Xvfb before tagged artifacts can be published.
- GNOME, KDE, Wayland, and X11 capability differences are documented in `docs/linux-smoke-test.md`; copy-only fallback is part of the stable contract when a compositor blocks synthetic input.
