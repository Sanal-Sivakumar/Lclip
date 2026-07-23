# Linux stable-release verification

LClip separates release-blocking automation from compositor-specific observation. Native package builds and runtime startup are CI-enforced. GNOME, KDE, Wayland, and X11 behavior is still recorded on real desktops because a headless runner cannot approve a portal, transfer focus, inject input, or drag a compositor-managed window.

## CI-enforced architecture checks

| Environment | Build | Runtime launch | Release formats | Enforcement |
| --- | --- | --- | --- | --- |
| Automated Linux x86-64 | Native `ubuntu-24.04` runner | 12-second Xvfb residency check | AppImage, deb, rpm, tar.gz | CI-enforced |
| Automated Linux ARM64 | Native `ubuntu-24.04-arm` runner | 12-second Xvfb residency check | AppImage, deb, rpm, tar.gz | CI-enforced |

A stable tag cannot publish until source verification, dependency audit, both native builds, both runtime launch checks, canonical asset assembly, `SHA256SUMS`, and provenance attestation complete.

## Core fallback contract

These outcomes define stable behavior across supported desktops:

- selecting text or a character writes it to the normal clipboard before input automation is attempted;
- a working bridge may send `Ctrl+V`, but bridge or compositor rejection keeps the copied value intact and shows the manual-paste instruction;
- shortcut registration, portal routing, GNOME-native configuration, login startup, paste bridge, and persistence have separate visible status rows;
- every persistence failure is observable and never displayed as a successful disk save;
- a fresh global opening resets to Clipboard History, while the reopen after a selection preserves the working mode;
- user and system installers restore the previous runtime and integration files after activation failures.

## Guided real-desktop check

Run this inside the graphical session being evaluated:

```bash
npm run smoke:linux
```

The runner accepts either `/opt/lclip` or the no-root `~/.local/opt/lclip` installation. It checks the packaged executable, launcher, build marker, per-user autostart, resident process, available input bridge, and any GNOME custom shortcut. When attached to a terminal it prompts for the interactions that require a human observer.

## Ongoing compatibility matrix

Do not convert “not yet observed on this release” into a pass. Add a dated evidence link whenever a maintainer or user completes a row.

| Environment | Expected shortcut path | Expected paste path | Stable fallback | Current evidence |
| --- | --- | --- | --- | --- |
| GNOME Wayland with Xwayland | GNOME custom shortcut from guided install, otherwise Electron/portal | `ydotool`, then `wtype`/`xdotool` when usable | Clipboard + manual `Ctrl+V` | Ongoing community verification |
| KDE Plasma Wayland | Global Shortcuts portal | `ydotool` or `wtype` | Clipboard + manual `Ctrl+V` | Ongoing community verification |
| GNOME or Plasma X11 | Electron/X11 | `xdotool` or available bridge | Clipboard + manual `Ctrl+V` | Ongoing community verification |
| ARM64 graphical Linux | Desktop-specific | Available bridge | Clipboard + manual `Ctrl+V` | Native build/startup is enforced; compositor observations remain ongoing |

## Manual acceptance sequence

1. Confirm Settings shows the installed version and six distinct integration/storage rows.
2. Press `Super + .`; if a portal asks for approval, approve only that chord.
3. Confirm every fresh invocation opens History with an empty search.
4. Drag the clear 44px strip above Search and confirm Search and Close remain interactive.
5. Copy two unique text values and confirm deduplication, ordering, and the 10-item limit.
6. Select the older value in a text editor. Confirm either automatic paste or the explicit manual `Ctrl+V` fallback, then confirm the picker reopens without resetting the current mode.
7. Search Emoji and Symbols with the keyboard and activate the selected option with Enter.
8. Force an unwritable state path in a disposable profile and confirm the visible storage error.
9. Start two GIF searches quickly and confirm the stale request cannot replace the newer results; confirm oversized content is rejected.
10. Log out and back in to verify the selected autostart setting.
11. Run the relevant uninstaller and confirm integration is removed while user history is preserved unless purge was requested.

Evidence should identify distribution and version, desktop version, session type, architecture, artifact name, LClip version, test date, result, and a durable issue, workflow, or log URL.
