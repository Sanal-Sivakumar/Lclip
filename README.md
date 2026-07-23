<div align="center">
  <img src="assets/io.lclip.LClip.svg" width="112" height="112" alt="LClip application icon">
  <h1>LClip</h1>
  <p><strong>Your clipboard, expressions, and reactions — one shortcut away.</strong></p>
  <p>A local-first, system-integrated clipboard history and expression picker for Linux.</p>
  <p>
    <a href="https://github.com/Sanal-Sivakumar/Lclip/actions/workflows/ci.yml"><img src="https://github.com/Sanal-Sivakumar/Lclip/actions/workflows/ci.yml/badge.svg" alt="Verify LClip status"></a>
    <a href="https://github.com/Sanal-Sivakumar/Lclip/releases/latest"><img src="https://img.shields.io/github/v/release/Sanal-Sivakumar/Lclip?display_name=tag&sort=semver&style=flat-square&color=c1e8f8" alt="Latest stable LClip release"></a>
    <img src="https://img.shields.io/badge/Linux-GNOME%20%7C%20KDE-85bed8?style=flat-square&logo=linux&logoColor=white" alt="Linux GNOME and KDE">
    <img src="https://img.shields.io/badge/Wayland%20%2B%20X11-28404c?style=flat-square" alt="Wayland and X11">
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-c1e8f8?style=flat-square" alt="GNU GPL version 3 license"></a>
  </p>
  <p>
    <code>Super</code> + <code>.</code>
  </p>
</div>

---

After its per-user login setting has been enabled, LClip can stay ready after graphical login. Press `Super + .` from any application to open a compact, dark layered-glass picker containing the last 10 copied text items, 244 offline emoji, 60 kaomoji, optional GIF search, and 124 useful symbols.

> [!IMPORTANT]
> LClip never replaces normal `Ctrl+C` or `Ctrl+V`. It registers only `Super + .`; it is not a keylogger and does not receive unrelated keystrokes.

**[Download stable LClip](#download-and-install)** · **[First run](#first-run)** · **[Build from source](#build-and-integrate-from-source)** · **[Troubleshooting](troubleshooting.md)**

## Contents

- [Features](#features)
- [How LClip behaves](#how-lclip-behaves)
- [Linux support](#linux-support)
- [Download and install](#download-and-install)
- [First run](#first-run)
- [Build and integrate from source](#build-and-integrate-from-source)
- [Global shortcut integration](#global-shortcut-integration)
- [Automatic paste on Wayland](#automatic-paste-on-wayland)
- [Using LClip](#using-lclip)
- [GIF search](#gif-search)
- [Development](#development)
- [Architecture](#architecture)
- [Privacy and security](#privacy-and-security)
- [GitHub and releases](#github-and-releases)
- [Uninstall](#uninstall)
- [Further documentation](#further-documentation)

## Features

| | Capability | What it gives you |
| --- | --- | --- |
| **▣** | **Clipboard history** | The latest 10 non-empty copied text items, deduplicated and stored locally |
| **☺** | **Emoji picker** | 244 searchable, categorized Unicode emoji with Noto Color Emoji preferred on Linux |
| **ツ** | **Kaomoji** | 60 categorized text faces that need no special image support |
| **GIF** | **GIPHY search** | Optional reaction search with a user-supplied API key |
| **Ω** | **Special characters** | More than 100 arrows, currencies, mathematics, punctuation, Greek, marks, and technical symbols |
| **⌨** | **Keyboard-first control** | Search, arrow navigation, `Enter` to paste, and `Esc` to close |
| **◉** | **Desktop integration** | Login autostart, tray controls, global shortcut, and automatic-paste bridge |
| **◇** | **Layered glass interface** | Compact, dark, readable material with a dedicated drag strip and independently scrolling content |

LClip can pause capture, clear history, and report shortcut or paste limitations honestly instead of silently claiming success.

## How LClip behaves

### Clipboard history

LClip checks the standard text clipboard every 350 milliseconds while capture is enabled. When the clipboard contains new, non-empty text, LClip adds it to the front of the local history. Each entry is limited to 50,000 characters, duplicate text is stored once, and only the newest 10 entries remain.

Images and files copied through a file manager are not added to the history in the current version. GIF selection is handled separately.

### Global shortcut

At startup, LClip asks Electron and the Linux desktop to register `Super + .` as a global shortcut. A global shortcut is a key combination that the desktop can deliver even while another application has focus. LClip does not continuously inspect every key that is pressed.

- On X11, the chord is normally registered directly.
- On Wayland, the request can be handled through the desktop's Global Shortcuts portal. Depending on the desktop and its security policy, a one-time approval dialog may appear.
- If the chord is already owned by the desktop or another application, LClip shows the conflict in Settings and does not substitute another shortcut.

On GNOME, the installer also creates a native desktop custom shortcut for the same `Super + .` chord. It executes `/usr/local/bin/lclip --show`, so the shortcut remains available even when Electron's Wayland portal registration is unavailable. It does not create `Super+V`, `Ctrl+V`, or any alternative binding.

Every fresh `Super + .` opening starts on **Clipboard history**, clears the previous search/category selection, closes Settings if necessary, and scrolls History to the top. The automatic reopen that follows a paste is part of the current interaction and does not perform this reset.

Shortcut support follows the desktop environment rather than the distribution name:

| Linux desktop/session | Shortcut integration |
|---|---|
| GNOME on Ubuntu, Fedora, Debian, Arch, openSUSE, or another distribution | Installer creates the native GNOME custom shortcut through `gsettings`; Electron registration remains as a second path |
| KDE Plasma on Kubuntu, Fedora KDE, KDE neon, openSUSE, Arch, or another distribution | Electron requests `Super + .` through the Wayland Global Shortcuts portal; KDE may show a one-time approval |
| X11 desktops including XFCE, Cinnamon, MATE, LXQt, GNOME Xorg, and Plasma X11 | Electron normally registers `Super + .` directly with X11 |
| Other Wayland compositors | Works when their XDG Desktop Portal supports global shortcuts; otherwise add `/usr/local/bin/lclip --show` manually in the desktop's keyboard-shortcut settings |

The installer and autostart files support common Debian/Ubuntu, Fedora/RHEL, Arch, and openSUSE families. A desktop-specific shortcut conflict can still require manual removal of the existing binding.

### Selecting and pasting an item

When an item is selected, LClip:

1. Writes the selected value to the normal system clipboard.
2. Briefly hides the picker so GNOME/KDE can restore keyboard focus to the previous application.
3. Waits for the desktop to complete that focus change.
4. Uses the best available input bridge to send the normal `Ctrl+V` paste action.
5. Reopens the picker in the same position for another selection.

LClip prefers `ydotool`, then `wtype` on Wayland, then `xdotool`. Hiding before injection is required on desktops where a visible frameless picker retains focus even after Electron marks it non-focusable. If Linux blocks automatic input or no bridge is installed, the item is still copied safely and LClip asks the user to press `Ctrl+V` manually. The picker reopens for multiple selections; click its close button, press `Esc`, or click another application to dismiss it.

### Window, scrolling, and character browsing

- Drag anywhere in the clear strip above Search. It is an Electron native draggable region, while the close button is explicitly excluded so it remains clickable.
- Scroll inside the results region with a mouse wheel, touchpad, scrollbar, or keyboard navigation. History, emoji, kaomoji, GIF, symbols, and Settings each keep their own bounded scroll area.
- Emoji categories follow common Unicode/CLDR grouping and render with the installed platform font, preferring `Noto Color Emoji` on Linux. LClip does not download emoji while you type.
- The interaction model takes cues from the familiar Windows emoji panel—one search field, clear content modes, categories, arrow navigation, and Enter to insert—without copying Windows artwork or changing LClip's Linux-native identity.
- The persistent footer has been removed. Capture, shortcut, paste-bridge, and window-backend diagnostics remain available in Settings when they are needed.
- Settings also shows the installed Git revision, making it easy to distinguish a current build from an older resident process.

## Linux support

LClip is designed for GNOME and KDE Plasma in Wayland or X11 sessions. On a Wayland session with Xwayland available, LClip uses an Xwayland-backed picker window by default because Electron cannot reliably inspect or programmatically move a native Wayland window. Clipboard capture, GNOME's native `Super + .` binding, and `ydotool` automatic paste still operate in the surrounding Wayland session. Set `LCLIP_NATIVE_WAYLAND=1` only to opt back into native Wayland rendering and accept that manual window movement may be unavailable.

This repository is developed and packaged from macOS as well as Linux, but the operating-system integration must be verified on a real Linux graphical session. A successful build on macOS does not prove that a particular GNOME or KDE configuration will permit synthetic paste.

Supported environment:

- 64-bit Linux on x86-64 or ARM64
- a current glibc-based distribution
- GNOME, KDE Plasma, or a compatible X11/Wayland desktop
- a graphical user session

The stable prebuilt release does **not** require Node.js, npm, root access, or FUSE when installed with the portable installer. Node.js and `sudo` are needed only for the advanced source/system integration path.

## Download and install

### Recommended: no-root portable installer

This is the smoothest option across Ubuntu, Debian, Fedora, openSUSE, Arch, Mint, Pop!_OS, elementary OS, and other current 64-bit glibc distributions. It detects x86-64 or ARM64, downloads the matching portable archive, verifies `SHA256SUMS`, installs below `~/.local`, creates the application-menu and login entries, and restores the previous user installation if activation fails.

```bash
mkdir -p ~/Downloads/lclip-install
cd ~/Downloads/lclip-install
curl -fLO https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/install-lclip.sh
less install-lclip.sh
chmod +x install-lclip.sh
./install-lclip.sh
```

If `curl` is unavailable, use:

```bash
wget https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/install-lclip.sh
chmod +x install-lclip.sh
./install-lclip.sh
```

The installer requires only `curl` or `wget`, `tar`, and `sha256sum`. Run `./install-lclip.sh --help` for a custom prefix, a specific version, or installation without login autostart.

### Direct stable downloads

Check your architecture with `uname -m`: `x86_64` uses x64 downloads; `aarch64` or `arm64` uses ARM64 downloads.

| Architecture | Portable tar.gz | AppImage | Distribution packages |
| --- | --- | --- | --- |
| x86-64 | [Portable](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/LClip-linux-x64.tar.gz) | [AppImage](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/LClip-linux-x64.AppImage) | [Debian/Ubuntu](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/LClip-linux-x64.deb) · [Fedora/RHEL/openSUSE](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/LClip-linux-x64.rpm) |
| ARM64 | [Portable](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/LClip-linux-arm64.tar.gz) | [AppImage](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/LClip-linux-arm64.AppImage) | [Debian/Ubuntu](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/LClip-linux-arm64.deb) · [Fedora/RHEL/openSUSE](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/LClip-linux-arm64.rpm) |

The release also includes [`SHA256SUMS`](https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/SHA256SUMS) and GitHub build-provenance attestations. Packages are not currently signed with a distribution-specific GPG key; verify the SHA-256 manifest and attestation when provenance matters.

Verify a downloaded file from the directory containing it:

```bash
sha256sum --check SHA256SUMS --ignore-missing
```

Run an AppImage without a system install:

```bash
chmod +x LClip-linux-x64.AppImage
./LClip-linux-x64.AppImage --show
```

If the AppImage host lacks FUSE, use the recommended portable installer or run the AppImage with `APPIMAGE_EXTRACT_AND_RUN=1`.

Install a distribution package with the normal package manager:

```bash
sudo apt install ./LClip-linux-x64.deb
# Fedora/RHEL:
sudo dnf install ./LClip-linux-x64.rpm
# openSUSE:
sudo zypper install ./LClip-linux-x64.rpm
```

Prebuilt packages provide the app, menu entry, Electron shortcut path, and LClip's per-user login autostart. They do not silently grant `/dev/uinput` access or create GNOME's native custom shortcut. Use the source/system installer for complete opt-in `ydotool` and GNOME integration.

### Installed locations for the portable installer

| Location | Purpose |
| --- | --- |
| `~/.local/opt/lclip/` | Portable application runtime |
| `~/.local/bin/lclip` | Terminal launcher |
| `~/.local/share/applications/io.lclip.LClip.desktop` | Application-menu entry |
| `~/.local/share/icons/hicolor/scalable/apps/io.lclip.LClip.svg` | User application icon |
| `~/.config/autostart/io.lclip.LClip.desktop` | Per-user login startup |
| `~/.config/LClip/state.json` | Private clipboard history and settings |

## First run

1. Open **LClip** from the application menu. If `~/.local/bin` is in `PATH`, `lclip --show` works too.
2. Open Settings and confirm the separate Electron, portal, GNOME-native, login-startup, paste-bridge, and local-storage rows.
3. Press `Super + .`. A Wayland desktop may ask once for shortcut approval. If registration is unavailable, create a desktop shortcut pointing to `~/.local/bin/lclip --show`.
4. Copy two ordinary text values with `Ctrl+C`; open LClip and select the older value.
5. If automatic paste is unavailable, the value is still on the clipboard—focus the target and press `Ctrl+V`.
6. Run the guided desktop check with `bash scripts/smoke-linux.sh` from a source checkout when qualifying a machine or release.

## Build and integrate from source

Use this advanced path when you want a system-wide `/opt/lclip` installation, native GNOME shortcut configuration, or restricted `ydotool` `/dev/uinput` integration. It requires Node.js 22.12.0 or newer, npm, Git, an active graphical session, and `sudo`.

Confirm the build tools:

```bash
node --version
npm --version
```

The Node.js output must be `v22.12.0` or newer. Ubuntu's default Node.js 18 package is not sufficient for Electron 43.

If Node 22 is not installed, one supported approach is NVM:

```bash
sudo apt update
sudo apt install -y git curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
nvm alias default 22
node --version
```

Review third-party installation scripts before executing them. Alternatively, install Node.js 22 through a trusted package source provided for your distribution.

### Guided system installation

Clone the repository:

```bash
git clone --depth 1 https://github.com/Sanal-Sivakumar/Lclip.git
cd Lclip
chmod +x scripts/install-system.sh scripts/uninstall-system.sh
```

For GNOME or KDE on Wayland, use the recommended installation command below. It installs LClip and configures restricted access to Linux's virtual-input device so selecting an item can automatically paste it:

```bash
./scripts/install-system.sh --configure-ydotool
```

For X11, or when you want to configure input automation yourself, use:

```bash
./scripts/install-system.sh
```

The installer performs the complete setup:

1. Confirms that it is running on Linux.
2. Installs the exact JavaScript dependencies from `package-lock.json`.
3. Runs syntax checks and all automated tests.
4. Deletes stale `dist/` output and builds a fresh Electron application bundle.
5. Stops any resident older LClip process before replacing the installation.
6. Detects whether the laptop uses x86-64 or ARM64, stages the matching bundle, and restores the previous application plus backed-up launcher, menu, icon, autostart, and optional input-integration files if activation or required integration fails.
7. Records the installed Git revision and starts the new resident process in the current graphical session.
8. Creates the `lclip` terminal command and application-menu entry.
9. Adds graphical-login autostart for supported desktop environments.
10. Attempts to configure the native `Super + .` custom shortcut when installing from a GNOME session and reports a desktop-specific failure without hiding it.
11. Attempts to install automatic-paste tools using `apt`, `dnf`, `pacman`, or `zypper`.
12. With `--configure-ydotool`, installs both the `ydotool` client and separately packaged `ydotoold` daemon when required by the distribution.
13. Creates a dedicated `lclip-uinput` group, installs a narrowly scoped udev rule for `/dev/uinput`, and adds the current desktop user to that group.
14. Installs and, on systemd desktops, enables `~/.config/systemd/user/lclip-ydotoold.service` when the distribution does not provide a usable user service.

### Connect and contribute

Settings includes direct links to the [LClip GitHub repository](https://github.com/Sanal-Sivakumar/Lclip) for source code, issues, and contributions, and to [sanalsiva2005@gmail.com](mailto:sanalsiva2005@gmail.com) for contacting the developer. LClip opens only these approved destinations in the system browser or mail application; webpage content is never embedded inside the picker.

> [!IMPORTANT]
> After using `--configure-ydotool`, **log out of Linux completely and log back in**. Opening a new terminal is not enough. Linux applies the new `lclip-uinput` group membership only to a new login session.

After logging back in, confirm the environment and start LClip:

```bash
groups | tr ' ' '\n' | grep '^lclip-uinput$'
systemctl --user status lclip-ydotoold.service --no-pager
lclip --show
```

Press `Super + .` to confirm that the global picker opens. Open a text editor, copy two different pieces of text, select the older one in LClip, and confirm that it is pasted into the editor. LClip starts in the background automatically after graphical login.

> [!NOTE]
> Wayland may show a one-time desktop approval for the global shortcut. That permission belongs to GNOME/KDE and is not requested every time the picker opens.

### Install without an input bridge

If you want to configure `ydotool`, `wtype`, or `xdotool` yourself:

```bash
./scripts/install-system.sh --skip-input-bridge
```

LClip will still copy selected values to the clipboard. Until a supported bridge is available, press normal `Ctrl+V` to paste the selected value.

### Installer options

| Command | Result |
| --- | --- |
| `./scripts/install-system.sh --configure-ydotool` | Recommended Wayland installation with restricted `/dev/uinput` access; requires logout/login |
| `./scripts/install-system.sh` | Standard installation with best-effort bridge package and service setup |
| `./scripts/install-system.sh --skip-input-bridge` | Installs LClip without installing or configuring input tools |
| `./scripts/install-system.sh --help` | Prints available installer options |

### Installed locations

| Location | Purpose |
| --- | --- |
| `/opt/lclip/` | Packaged Electron application |
| `/usr/local/bin/lclip` | Command available in the terminal |
| `/usr/share/applications/io.lclip.LClip.desktop` | Application-menu entry |
| `/usr/share/icons/hicolor/scalable/apps/io.lclip.LClip.svg` | System application icon |
| `/etc/xdg/autostart/io.lclip.LClip.desktop` | Starts LClip after graphical login |
| `~/.config/autostart/io.lclip.LClip.desktop` | Per-user enabled/disabled login entry written by LClip; also supports tagged packages |
| `/etc/udev/rules.d/80-lclip-uinput.rules` | Optional restricted `/dev/uinput` rule created by `--configure-ydotool` |
| `/etc/modules-load.d/lclip-uinput.conf` | Ensures the `uinput` kernel module is available after boot |
| `~/.config/systemd/user/lclip-ydotoold.service` | Per-user daemon service created by `--configure-ydotool` |

## Global shortcut integration

`Super + .` means: hold the Windows-logo key, press the normal period/full-stop key beside the comma, and release both.

LClip uses two compatible registration paths:

1. **Electron global shortcut** — direct registration on X11 or the Global Shortcuts portal on compatible Wayland desktops.
2. **GNOME native shortcut** — installed through `gsettings` with command `/usr/local/bin/lclip --show` and binding `<Super>period`.

The native GNOME shortcut is created by `scripts/configure-gnome-shortcut.mjs`. Existing GNOME custom shortcuts are preserved. The uninstaller removes only LClip's entry.

Verify the GNOME entry with:

```bash
gsettings get org.gnome.settings-daemon.plugins.media-keys.custom-keybindings
```

On KDE Plasma, Electron uses the Wayland portal when supported. If the desktop asks once for approval, approve only `Super + .`.

## Automatic paste on Wayland

Copying a value to the clipboard and injecting `Ctrl+V` into another application are separate operations. Wayland deliberately restricts synthetic keyboard input.

LClip attempts the installed bridges in this order:

1. `ydotool`, using Linux `/dev/uinput` through the `ydotoold` service;
2. `wtype`, when the Wayland compositor supports its virtual-keyboard protocol;
3. `xdotool`, for X11 or compatible Xwayland targets.

If one bridge fails, LClip tries the next. If all fail, the selected item remains on the clipboard, the picker reopens, and LClip asks you to press `Ctrl+V`. This is a safe fallback rather than data loss.

Ubuntu 24.04 currently supplies `ydotool 0.1.8`, which uses symbolic shortcuts such as `ydotool key ctrl+v`. Modern ydotool 1.x uses explicit Linux key-code press/release events. LClip detects the installed syntax: it sends symbolic `ctrl+v` to 0.x and numeric key events to 1.x. This prevents old versions from typing digits instead of pasting.

For reliable `ydotool` operation, install with:

```bash
./scripts/install-system.sh --configure-ydotool
```

Then log out and back in. Do not use `chmod 666 /dev/uinput`, do not run the entire LClip application as root, and do not disable Electron's sandbox.

### Update or reinstall

```bash
cd ~/Documents/Lclip
git pull --ff-only origin main
pkill -x lclip 2>/dev/null || true
rm -rf node_modules dist
./scripts/install-system.sh --configure-ydotool
```

Log out and back in if the installer created or changed the `lclip-uinput` membership. Existing LClip history is preserved during reinstall.

### Why LClip is not a root boot daemon

The active clipboard, focused window, display server, and global shortcuts belong to the logged-in graphical session. A root service started before login normally has no correct display session to control. It would also be a security mistake to place copied passwords and personal text inside a privileged process.

LClip is therefore **installed system-wide** under `/opt/lclip`, but **runs as the logged-in user** through standard XDG autostart. This is the normal OS-integrated design for a desktop utility.

## Using LClip

1. Copy text normally with `Ctrl+C` or an application's Copy command.
2. Press `Super + .` from any application.
3. Choose History, Emoji, Kaomoji, GIFs, or Symbols.
4. Search by typing, move with the arrow keys, and press `Enter`; or click an item.
5. Press `Esc` or click outside the picker to close it without selecting anything.

Useful controls:

- **Pause capture** stops adding new clipboard text without deleting existing history.
- **Clear** permanently removes the currently stored history entries.
- **Start after login** writes an explicit per-user XDG autostart entry, so the setting works for both guided and tagged-package installations.
- The tray icon can open LClip, pause or resume capture, and quit the process.

## GIF search

GIF search is the only network-backed feature. Create a GIPHY developer key, open LClip Settings, enter the key, choose a content rating, and save.

The request is made by Electron's main process. The renderer is not allowed to make arbitrary network connections. Results are limited to HTTPS URLs belonging to GIPHY. New searches cancel older in-flight requests, selected downloads time out after 12 seconds, redirects are revalidated, and the response stream is cancelled as soon as downloaded data exceeds 15 MB.

Applications treat GIF clipboard content differently. LClip places an image, an HTML image reference, and the GIPHY URL on the clipboard so the target can choose a supported format. Plain-text targets may paste only the URL.

## Development

Install dependencies and open the development build:

```bash
npm ci
npm run dev
```

Run syntax checks and the automated tests:

```bash
npm run verify
```

After installing LClip on Linux, run the guided desktop smoke test:

```bash
npm run smoke:linux
```

The complete GNOME, KDE, X11, and ARM64 acceptance matrix is in [`docs/linux-smoke-test.md`](docs/linux-smoke-test.md).

Build an unpacked Linux application:

```bash
npm run pack:linux
```

Build AppImage, Debian, RPM, and portable tar.gz artifacts:

```bash
npm run dist:linux
```

The desktop integrations do not run fully on macOS. On macOS, the renderer can be reviewed and the store and bridge-detection tests can run, but the final shortcut, autostart, clipboard, tray, and paste behavior should be tested on Linux.

## Architecture

LClip is an Electron application split into security boundaries:

- `src/main/main.mjs` owns the desktop window, clipboard monitor, global shortcut, tray, state, GIPHY requests, and system integration.
- `src/main/store.mjs` validates, limits, deduplicates, and persists local state.
- `src/main/paste-bridge.mjs` detects and invokes a supported Linux input tool.
- `src/main/giphy.mjs` validates GIPHY URLs and enforces streaming download limits.
- `src/main/ipc-handlers.mjs` defines the narrow, independently tested IPC contract.
- `src/main/window-backend.mjs` selects native or Xwayland-compatible rendering for reliable window movement.
- `src/preload/preload.cjs` exposes a small, named API to the UI through Electron's context bridge.
- `src/renderer/` contains the HTML, layered-material CSS, browser-side interaction code, and offline character catalog.
- `scripts/` contains no-root release installation, system integration, uninstallation, packaged-runtime smoke, and desktop smoke tools.
- `tests/` verifies history and persistence behavior, IPC contracts, network limits, paste-bridge selection, window-backend decisions, and offline catalog coverage.

See [technical_details.md](technical_details.md) for a beginner-friendly explanation of Electron, GNOME, KDE, X11, Wayland, portals, IPC, autostart, packaging, and every major runtime flow.

## Privacy and security

- History is local and capped at 10 text entries.
- State is written with user-only file permissions (`0600`) inside a user-only directory (`0700`).
- LClip registers one global chord and does not record arbitrary keyboard input.
- The UI has Node.js integration disabled, context isolation enabled, and Electron sandboxing enabled.
- A restrictive Content Security Policy blocks arbitrary scripts, objects, navigation, and renderer network connections.
- External links are limited to official GIPHY pages and open in the system browser.
- GIPHY is optional; history, emoji, kaomoji, and symbols work offline.
- The uninstaller preserves user data to prevent unexpected data loss.

Clipboard managers are inherently sensitive because copied text can contain secrets. Pause capture before copying confidential material, clear history when necessary, and protect the Linux user account and disk.

## GitHub and releases

CI runs syntax, state, IPC, network-boundary, desktop-status, release-contract, and catalog tests; audits the dependency graph; then builds and launches the packaged application under Xvfb on native x86-64 and ARM64 runners. A matching stable tag publishes AppImage, Debian, RPM, and portable tar.gz artifacts for both architectures, plus the no-root installer, checksum manifest, and build-provenance attestations. After publication, fresh native x86-64 and ARM64 runners download the public installer, install without root into an isolated home directory, launch that exact installed runtime, and exercise the public uninstaller.

```bash
npm run verify
npm audit --audit-level=high
npm run verify:release
git tag -a v1.0.1 -m "LClip 1.0.1"
git push origin main
git push origin v1.0.1
```

Tags are immutable publication boundaries: do not replace artifacts on an existing tag. Stable publication requires the complete automated distribution contract, native builds, packaged-runtime residency checks, checksums, and attestations. Real compositor checks remain ongoing compatibility evidence rather than fabricated pass claims; automatic paste always retains a copy-only fallback. Follow [RELEASE.md](RELEASE.md) for the exact gate.

## Uninstall

For a no-root portable installation, download and run the matching stable uninstaller:

```bash
curl -fLO https://github.com/Sanal-Sivakumar/Lclip/releases/latest/download/uninstall-lclip.sh
chmod +x uninstall-lclip.sh
./uninstall-lclip.sh
```

Add `--purge-data` only if clipboard history and settings should also be deleted.

For the guided system installation, run from the same repository checkout:

```bash
./scripts/uninstall-system.sh
```

The uninstaller removes the application, launcher, menu entry, icon, system autostart file, and the current user's autostart override. It deliberately leaves the current user's LClip history and settings in place. The script prints the remaining location so it can be deleted manually if desired.

For a tagged Debian or RPM package, disable **Start after login** before removing the package, use the distribution package manager, then remove only `~/.config/autostart/io.lclip.LClip.desktop` if that LClip-owned entry remains. Package managers cannot safely delete per-user files for every account.

## Further documentation

| Document | Start here when you want to… |
| --- | --- |
| **[Technical Details](technical_details.md)** | Understand GNOME, KDE, X11, Wayland, Xwayland, portals, Electron, IPC, security, packaging, and LClip's complete data flow from first principles |
| **[Troubleshooting](troubleshooting.md)** | Diagnose installation, autostart, shortcut, clipboard, automatic-paste, GIPHY, graphics, or development failures |
| **[Product](PRODUCT.md)** | Read the product purpose, intended users, principles, and accessibility goals |
| **[Design](DESIGN.md)** | Explore the visual system, interface decisions, colors, spacing, and interaction direction |
| **[Release Process](RELEASE.md)** | Publish architecture-specific stable installers and verify checksums and attestations |
| **[Changelog](CHANGELOG.md)** | Review stable user-visible changes and compatibility boundaries |
| **[Production Readiness](PRODUCTION_READINESS.md)** | See the stable controls, collected evidence, and ongoing desktop qualification work |
| **[History Rewrite](docs/history-rewrite.md)** | Understand the completed `.venv` cleanup and contributor migration |

> New to Linux desktop terminology? Begin with **[LClip Technical Details](technical_details.md)**. If something is not working, go directly to **[LClip Troubleshooting](troubleshooting.md)**.

## License

LClip is free software licensed under the **[GNU General Public License version 3.0 only](LICENSE)** (`GPL-3.0-only`). You may use, study, modify, and redistribute it. If you distribute a modified version or another covered work based on LClip, the GPL requires that recipients receive the corresponding source code and the same GPLv3 freedoms.

This is LClip's copyleft commitment: distributed versions cannot be converted into closed-source proprietary editions. The GPL does not require someone to publish modifications that remain entirely private and are never distributed.

Linux packages include a copy of `LICENSE` in the application's resources so recipients receive the license with the program.
