# LClip

LClip is a system-integrated clipboard history and expression picker for Linux. It stays ready after graphical login and opens from anywhere with one shortcut:

```text
Super + .
```

Normal `Ctrl+C` and `Ctrl+V` behavior is never replaced or intercepted.

## What it does

- Keeps the 10 most recent copied text items, locally
- Pastes a selected history item into the previously focused application
- Provides offline emoji, kaomoji, and special-character pickers
- Provides optional GIPHY search with a user-supplied API key
- Runs in the user session after login, with a tray fallback
- Supports GNOME and KDE on Wayland, with X11 compatibility
- Registers only `Super + .`; it does not capture arbitrary keystrokes

## System installation

Requirements for building:

- A 64-bit Linux installation
- Node.js 20 or newer
- npm
- `sudo` for the system installation step

Run:

```bash
chmod +x scripts/install-system.sh scripts/uninstall-system.sh
./scripts/install-system.sh
```

The installer builds and verifies LClip, then installs:

```text
/opt/lclip/                                      packaged application
/usr/local/bin/lclip                            command launcher
/usr/share/applications/io.lclip.LClip.desktop application-menu entry
/usr/share/icons/hicolor/                       application icon
/etc/xdg/autostart/io.lclip.LClip.desktop      graphical-login autostart
```

It also attempts to install an appropriate automatic-paste bridge: `ydotool`, `wtype`, or `xdotool`. Use `./scripts/install-system.sh --skip-input-bridge` if you want to manage that dependency yourself.

Start LClip immediately with:

```bash
lclip --show
```

## Why it starts after login, not as a root boot daemon

The clipboard and keyboard shortcut belong to the logged-in graphical session. A root service cannot safely own a user's GNOME or KDE clipboard and would turn copied passwords into privileged process data. LClip is installed system-wide under `/opt`, but it runs with the permissions of the logged-in user through the standard XDG autostart mechanism.

## Global shortcut behavior

LClip uses the operating system's global shortcut facility and registers only `Super + .`. It does not implement a keylogger or receive a stream of unrelated keystrokes.

- X11 normally registers the chord directly.
- Wayland uses the Global Shortcuts portal. Some desktops display a one-time approval when the chord is first registered. The desktop persists that approval; LClip does not request it every time it opens.

If another application or desktop action already owns `Super + .`, LClip reports the conflict in Settings instead of silently substituting another shortcut.

## Automatic paste

After an item is selected, LClip writes it to the standard clipboard, hides, restores focus to the previous application, and invokes the available Linux input bridge:

1. `ydotool` for compositor-independent Linux input
2. `wtype` for Wayland compositors that support the virtual-keyboard protocol
3. `xdotool` for X11 and compatible Xwayland applications

Wayland intentionally controls synthetic input. If the current compositor blocks every installed bridge, LClip keeps the item copied and reports that automatic paste is unavailable rather than claiming it succeeded.

## GIF search

GIPHY is optional. Add a key in LClip Settings. The key is stored with the rest of the user's LClip state under the Electron user-data directory with file mode `0600`.

GIPHY is the only network-backed feature. Clipboard history, emoji, kaomoji, and symbols remain offline.

## Development

```bash
npm install
npm run dev
npm run verify
```

Create Linux packages with:

```bash
npm run dist:linux
```

## Move from this Mac to your Linux laptop

After pushing this repository to GitHub, clone it on the Linux laptop and run the system installer:

```bash
git clone --depth 1 https://github.com/Sanal-Sivakumar/Lclip.git
cd Lclip
./scripts/install-system.sh
```

The installer verifies the source, builds the correct package for the laptop's processor, installs LClip under `/opt/lclip`, and enables graphical-login autostart. Log out and back in once, or start it immediately with `lclip --show`.

## GitHub automation

- `.github/workflows/ci.yml` verifies every push and pull request and uploads an unpacked x86-64 Linux build.
- `.github/workflows/release.yml` creates AppImage and Debian installers when a tag such as `v1.0.0` is pushed.

To publish a release after the main branch is ready:

```bash
git tag v1.0.0
git push origin main --tags
```

## Privacy and security

- History is capped at 10 text entries.
- History and settings stay in the local user-data directory.
- Renderer code runs with Node integration disabled, context isolation enabled, and Electron sandboxing enabled.
- GIPHY requests are made in the main process; the renderer cannot make arbitrary network requests.
- The application never reads arbitrary keyboard input.
- Capture can be paused and history can be cleared from the picker.

## Uninstall

```bash
./scripts/uninstall-system.sh
```

The uninstaller deliberately leaves the current user's local LClip history in place and tells you where it is. This avoids silently deleting user data.
