# Changelog

All notable LClip changes are documented here. The project follows semantic versioning while it moves through beta validation.

## [1.0.0-beta.1] - 2026-07-23

### Added

- Observable local-persistence status and actionable failure messages.
- Stream-bounded, cancellable GIPHY searches and downloads with redirect, host, and media-type validation.
- Testable Electron IPC registration and structured Electron, portal, GNOME-native, paste-bridge, and persistence diagnostics.
- Guided GNOME, KDE, Wayland, X11, and ARM64 smoke-test matrix.
- Per-user XDG autostart that works consistently for guided installs, AppImages, Debian packages, and RPM packages.
- Native x86-64 and ARM64 AppImage, Debian, and RPM release jobs with SHA-256 checksums and build attestations.

### Changed

- The system installer stages replacements and restores the previous application, system-integration files, user service, and prior group membership when activation or required integration fails.
- History and expression results use repaired listbox semantics, active-descendant focus tracking, and 44 px minimum interactive targets.
- Landing-page product claims now distinguish current behavior from concept artwork and permission-dependent desktop integration.

### Validation status

- Automated syntax, state, persistence, IPC, network-limit, shortcut-status, paste-bridge, backend, and catalog tests pass locally.
- Real Linux desktop validation remains explicitly tracked in `docs/linux-smoke-test.md`; this version must remain a prerelease until that matrix has evidence.
