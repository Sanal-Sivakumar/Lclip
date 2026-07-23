# Linux Release Smoke Test

Run this checklist on every supported release candidate from the installed artifact—not from a browser preview. Test at least GNOME Wayland and KDE Plasma Wayland; add one X11 desktop before promoting a beta to stable.

## Automated preflight and guided desktop checks

```bash
npm run smoke:linux
```

The runner verifies the executable, launcher, build marker, resident process, available paste bridge, and GNOME shortcut entry. When attached to a terminal, it guides the operator through the compositor-dependent checks that automation cannot prove.

## Required test matrix

| Environment | Artifact | Shortcut | Window drag | Text paste | Manual fallback | Result | Evidence |
|---|---|---|---|---|---|---|---|
| GNOME Wayland with Xwayland | AppImage and deb | Native GNOME + resident process | Required | `ydotool` | Required | Pending | Pending |
| KDE Plasma Wayland | AppImage | Global Shortcuts portal | Required | `ydotool` or `wtype` | Required | Pending | Pending |
| GNOME or Plasma X11 | AppImage | Electron/X11 | Required | `xdotool` | Required | Pending | Pending |
| ARM64 Linux graphical session | ARM64 AppImage or deb | Desktop-specific | Required | Available bridge | Required | Pending | Pending |

## Release acceptance

- The installed revision shown in Settings matches the artifact under test.
- `Super + .` opens globally and every fresh invocation resets to History.
- Post-paste reopening preserves the current mode and query session.
- The titlebar drag strip works without interfering with Search or Close.
- History records only non-empty text, deduplicates values, caps entries at 10, and survives restart.
- A forced unwritable state path produces a visible save error rather than a false success.
- Automatic paste works where the desktop permits it; otherwise the copy-only message is accurate.
- GIF searches cancel stale requests, oversized downloads are rejected, and offline errors offer retry.
- Autostart survives a full logout/login cycle.
- Settings shows the per-user login-startup entry separately and the entry's `Exec` path still exists.
- Uninstall removes system integration while preserving user history as documented.

Do not mark Linux integration verified from unit tests, a macOS build, or the browser preview. Attach the completed matrix and build revision to the GitHub release notes.

Use `Pass` or `Fail` in the Result column. Evidence must name the distribution/desktop version, session type, architecture, artifact filename, LClip build revision, test date, and a durable log or issue URL. The stable-release validator rejects missing evidence.
