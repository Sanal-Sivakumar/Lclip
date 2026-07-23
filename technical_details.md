# LClip Technical Details

This document explains LClip from first principles. It is written for readers who may be new to Linux desktops, Electron, JavaScript, clipboard managers, global shortcuts, packaging, and security boundaries.

## 1. The complete idea in plain language

LClip is a background desktop application for Linux. After a user signs into the graphical desktop, LClip starts and remains idle. It watches the **text clipboard**, remembers up to 10 recent values, and asks the desktop to reserve `Super + .` as a **global shortcut**. Pressing the shortcut opens a picker. Selecting a value places it on the clipboard and asks Linux to perform the same paste action as `Ctrl+V` in the previously active application.

The words “watch” and “global” do not mean that LClip records every keystroke. It polls the clipboard for text and registers one exact keyboard chord with the operating system.

## 2. Linux desktop vocabulary

### Linux

Linux is the operating-system kernel. A complete Linux installation also includes command-line tools, system libraries, a package manager, and usually a graphical desktop. Ubuntu, Fedora, Arch Linux, Debian, and openSUSE are examples of **distributions**: complete operating systems assembled around Linux.

### Desktop environment

A desktop environment supplies the panels, application launcher, settings, notifications, window-management experience, and common desktop services seen after login.

LClip primarily targets:

- **GNOME** — the desktop used by distributions such as Fedora Workstation and the standard Ubuntu edition, often with distribution-specific changes.
- **KDE Plasma** — a highly configurable desktop built using KDE technologies and the Qt toolkit.

Other environments include XFCE, Cinnamon, MATE, and LXQt. LClip's autostart file lists several environments, but the project's main integration target is GNOME and KDE.

Distribution and desktop environment are separate choices. Ubuntu commonly ships GNOME, Kubuntu ships KDE Plasma, and Fedora provides both GNOME and KDE editions. Shortcut integration therefore branches by desktop/session: GNOME receives a native `gsettings` entry, KDE Wayland uses the XDG Global Shortcuts portal, X11 desktops use Electron's direct X11 registration, and other Wayland compositors require a compatible portal or a manual desktop binding to `/usr/local/bin/lclip --show`.

### Display server and compositor

Applications need a system that draws windows, routes mouse and keyboard input, and tracks which window has focus.

A **display server** historically performed this job. A **compositor** combines application surfaces into the final image shown on screen, adding effects such as shadows, transparency, scaling, and animation. Modern Wayland desktops combine much of this responsibility inside a compositor.

### X11 and Xorg

**X11** is the older, widely supported Linux window-system protocol. **Xorg** is the most common X11 server implementation. People often use “X11” and “Xorg” informally to refer to the same kind of graphical session.

X11 permits applications to observe or synthesize more global input than Wayland normally allows. That makes utilities such as global hotkeys and automatic typing easier to implement, but it also creates security risks. In LClip, `xdotool` is the final fallback for sending `Ctrl+V`, mainly on X11.

### Wayland

**Wayland** is a newer protocol for communication between applications and a compositor. GNOME's compositor is called Mutter; KDE Plasma's is KWin. Wayland isolates applications more strongly: an ordinary application should not be able to inspect all keystrokes or inject input into any other application without a controlled mechanism.

This protection is why automatic paste can behave differently across Linux desktops. It is not simply a bug in LClip. The compositor decides which synthetic-input protocols or trusted services are available.

### Xwayland

**Xwayland** runs X11 applications inside a Wayland session. LClip now uses this compatibility backend for its own picker window when both `WAYLAND_DISPLAY` and `DISPLAY` indicate that a Wayland session and Xwayland are available. Electron documents that native Wayland generally prevents applications from querying or programmatically changing their global window position; an Xwayland window lets the desktop window manager honor Electron's native draggable region. This window-rendering choice is separate from automatic paste: `ydotool` can still target native Wayland applications through `uinput`, while `xdotool` normally reaches only X11/Xwayland targets.

### Session

A **graphical session** starts after the user signs in. It contains that user's desktop, clipboard, focus state, notification service, environment variables, and application processes.

Use this command to see the session type:

```bash
echo "$XDG_SESSION_TYPE"
```

Typical output is `wayland` or `x11`. The desktop name is often available through:

```bash
echo "$XDG_CURRENT_DESKTOP"
```

### The Super key

**Super** is the modifier key commonly marked with a Windows logo on PC keyboards. Desktop settings and programming libraries call it Super to avoid tying it to one operating-system brand. LClip's only global accelerator is `Super + .`, meaning Super and the period key pressed together.

### Global shortcut

A global shortcut is a specific chord registered with the desktop so it works while another application has focus. It is different from a **global keyboard hook**, which can receive many or all key events. LClip uses Electron's `globalShortcut` API and registers only `Super+.`.

### Portals and XDG Desktop Portal

**XDG Desktop Portal** is a set of desktop-neutral interfaces that lets sandboxed or security-conscious applications request desktop operations. A desktop-specific backend decides how the request is presented and enforced.

LClip enables Electron's `GlobalShortcutsPortal` and `GlobalShortcutsPortalPreferredTrigger` features. On compatible Wayland environments, Electron can ask the portal for the `Super + .` shortcut. The desktop may ask the user to approve it once and remember the decision. LClip cannot bypass a desktop's permission system, and it should not attempt to do so.

### GNOME native custom shortcut

Electron's portal registration can be unavailable or rejected on some GNOME/Wayland combinations. During installation from an active GNOME session, `scripts/configure-gnome-shortcut.mjs` also uses GNOME's `gsettings` interface to create one native custom shortcut:

```text
Name: LClip
Command: /usr/local/bin/lclip --show
Binding: <Super>period
```

The script reads the current custom-keybinding array, preserves every existing entry, and adds LClip's dedicated path. It never binds `Ctrl+V`, `Super+V`, or an alternative chord. The uninstaller removes only LClip's binding path. Electron registration and the GNOME command can both call `showWindow`; repeated show requests are idempotent and do not toggle the picker closed. A fresh external show emits `lclip:open`, which selects Clipboard History, clears Search and category state, closes Settings, resets keyboard selection, and scrolls History to the top.

### Clipboard and selection

The **clipboard** is a shared data exchange managed by the graphical session. Copy places one or more data formats on it; paste asks the focused application to read a format it understands.

Linux can also have a primary selection, commonly pasted with the middle mouse button. LClip reads Electron's normal `clipboard` selection, not the X11 primary selection. In the current version, history capture reads text only.

### Focus

The focused application receives keyboard input. When LClip opens, it temporarily becomes focused. Before automatic paste, it hides and waits 150 milliseconds so GNOME/KDE can make the previous application active again. This is the activation method proven to work on the reference GNOME Wayland system; keeping the picker visible or merely marking it non-focusable did not reliably transfer focus. After the paste bridge finishes, LClip leaves an additional 80-millisecond settling interval before reopening the picker for another selection. A normal focus loss caused by clicking outside still dismisses it.

## 3. Why LClip starts after login

There are two different meanings of “system integration”:

1. **System-wide installation** means files are installed in shared locations such as `/opt`, `/usr/local/bin`, and `/usr/share/applications`.
2. **User-session execution** means the process runs as the signed-in user and can communicate with that user's desktop.

LClip uses both. Its files may be installed system-wide, but its process starts as the logged-in user through XDG autostart after graphical login. Starting it as a root daemon during boot would be technically wrong because there may be no graphical session yet, and root should not collect a user's copied secrets.

### XDG autostart

**XDG** refers to cross-desktop standards maintained under the freedesktop.org ecosystem. An XDG autostart `.desktop` file tells compatible desktops to launch an application after login.

The guided installer creates a system fallback:

```text
/etc/xdg/autostart/io.lclip.LClip.desktop
```

This system entry executes:

```text
/usr/local/bin/lclip --hidden
```

LClip also writes an explicit per-user entry at:

```text
~/.config/autostart/io.lclip.LClip.desktop
```

Disabling autostart writes `Hidden=true`. Enabling it writes a complete launch entry using the current packaged executable or the original AppImage path. Because this is runtime-owned rather than dependent on the guided installer, portable, AppImage, Debian, and RPM builds can honor the same Settings control. The per-user file overrides the same-named system fallback without creating a duplicate launch.

### `.desktop` file

A `.desktop` file is a small text manifest describing a graphical application: its name, executable command, icon, categories, and startup behavior. It is not the application itself.

## 4. Electron and the application architecture

### Electron

**Electron** is a framework for desktop applications built with web technology. It combines Chromium, which renders HTML and CSS, with Node.js, which can access operating-system facilities. LClip uses Electron 43.2.0.

Electron applications usually have multiple processes:

- The **main process** controls application lifetime and privileged desktop APIs.
- The **renderer process** displays the interface using HTML, CSS, and JavaScript.
- A **preload script** exposes a deliberately limited bridge between them.

This separation prevents UI code from receiving unrestricted filesystem or process access.

### Main process

`src/main/main.mjs` is the entry point. It:

- selects native desktop or Xwayland-compatible window rendering before Electron starts;
- enables relevant Wayland and portal features;
- enforces a single running LClip instance;
- creates the transparent picker window;
- owns the Electron clipboard API;
- polls copied text every 350 milliseconds;
- registers `Super + .`;
- creates the tray menu;
- persists settings and history;
- performs GIPHY network requests;
- invokes an input bridge for automatic paste;
- handles messages from the renderer.

### Renderer process

`src/renderer/index.html`, `styles.css`, `app.js`, and `catalog.js` create the interface. The catalog contains 244 emoji, 60 kaomoji, and 124 symbols. The renderer filters these offline lists, responds to mouse and keyboard navigation, displays status, and asks the main process to perform privileged actions.

The renderer cannot import Node.js modules because `nodeIntegration` is disabled.

### Preload and context bridge

`src/preload/preload.cjs` runs in a special isolated context. It creates a small `window.lclip` API with functions such as `bootstrap`, `activate`, `clearHistory`, `saveSettings`, and `searchGifs`.

This is safer than exposing all of Electron. The renderer can request an approved action but cannot execute an arbitrary system command.

External Settings links follow the same narrow-boundary design. Electron denies new windows by default and delegates only the exact LClip GitHub URL, the developer's exact `mailto:` address, and GIPHY developer pages to the operating system through `shell.openExternal`. Arbitrary renderer-provided URLs are not accepted.

### IPC

**IPC** means inter-process communication. Electron's `ipcRenderer` sends a named message from the UI; `ipcMain` handles it in the main process. LClip uses explicit channel names beginning with `lclip:`. Examples include `lclip:activate` and `lclip:search-gifs`.

### BrowserWindow

The picker is a 700x510 Electron `BrowserWindow` configured as frameless, transparent, always on top, absent from the taskbar, visible on every workspace, and hidden when it loses focus. The visual “glass” comes from a mostly opaque tinted base, one translucent highlight layer, and compositor blur. The higher base opacity prevents detailed wallpaper from competing with text while still retaining environmental color. Actual appearance can differ with compositor support, GPU drivers, and accessibility settings.

The first show request is held until Electron emits `ready-to-show`, which avoids exposing a partially loaded window. LClip centers the picker once per running process. A clear 44-pixel strip above Search uses Electron's native `app-region: drag` contract, allowing the desktop window manager to perform the move. The close button uses `app-region: no-drag`, so it remains interactive. This avoids fragile renderer pointer capture, cursor polling, and repeated JavaScript `setPosition` calls. After movement, later openings preserve the user-selected position instead of forcing the picker back to the center.

On Wayland sessions, both the installed launcher and the in-process backend selector choose `--ozone-platform=x11` whenever Xwayland's `DISPLAY` is available. Passing the switch in `/usr/local/bin/lclip` ensures the backend is selected before Electron initializes its window. The selector does not treat Electron's internally populated ozone hint as a user request for native Wayland. Only `LCLIP_NATIVE_WAYLAND=1` disables the automatic Xwayland choice. Native Wayland remains available for systems without Xwayland, but Electron's window-position restriction means drag cannot be guaranteed there.

### Focus and repeated activation

Selecting a result does not destroy or recreate the picker process. The main process sets an `activationInProgress` guard, hides the `BrowserWindow`, waits for the previous application to regain focus, and invokes the paste bridge. After an 80-millisecond settling interval it calls `restoreWindowAfterPaste()`, which reveals the existing window without emitting the fresh-open reset event. This preserves the active mode during a repeated-selection session while retaining the exact focus handoff from commit `78a7701`, where automatic paste was confirmed working. The Xwayland launcher and native draggable-region changes remain independent of this paste flow.

The default Wayland installation uses Xwayland whenever available so draggable positioning works consistently. Paste still hides the picker briefly because the target application may be a native Wayland window that X11 focus APIs cannot activate directly.

### Scroll containment

The picker itself never grows to fit a long catalog. CSS Grid gives the content area a `minmax(0, 1fr)` results row, and the results element uses `overflow-y: auto`, `min-height: 0`, and contained overscroll. This combination is important: without `min-height: 0`, a grid child can keep its content-based minimum size and prevent the inner scrollbar from becoming usable. Settings has its own equivalent scroll container, while category chips share a dedicated row and wrap on narrow layouts.

### Emoji rendering and content references

Emoji are Unicode character sequences, not image files bundled by LClip. CSS requests `Noto Color Emoji` first on Linux, followed by Apple Color Emoji and Segoe UI Emoji as cross-platform development fallbacks. If the preferred font is absent or does not contain a new sequence, Chromium uses the operating system's configured fallback font.

Names and grouping use common Unicode/CLDR terminology. The catalog was broadened with the [Unicode Emoji Charts](https://unicode.org/emoji/charts/) and Google's open-source [Noto Emoji project](https://github.com/googlefonts/noto-emoji) as references. Microsoft's documented emoji-panel interaction—search, modes for emoji/GIF/kaomoji/symbols/history, arrow navigation, and Enter to insert—was used as a usability reference, not as copied artwork or source code: [Microsoft keyboard and text tools](https://support.microsoft.com/en-us/accessibility/windows/use-a-screen-reader-to-explore-and-navigate-different-keyboard-and-text-tools-in-windows).

### Tray

The tray is a small status icon provided by the desktop panel. GNOME may require an AppIndicator or tray extension to display traditional tray icons. The global shortcut and autostart do not logically depend on the icon being visible.

## 5. Runtime data flows

### Startup flow

1. Electron starts `src/main/main.mjs`.
2. LClip obtains a single-instance lock; a duplicate process exits.
3. The state file is loaded from Electron's user-data directory.
4. The available paste bridge is detected.
5. The hidden picker window and tray are created.
6. IPC handlers are registered.
7. The global shortcut is registered.
8. Clipboard polling begins.
9. The renderer loads while the window remains hidden.
10. `--show` opens the ready window; `--hidden` leaves it resident in the background.

The first process start is a **cold start** because Electron and the renderer must load. Later `lclip --show` commands encounter the single-instance lock and forward the request to the resident process, producing a much faster **warm opening**.

### Installed build identity

The system installer records the checkout's 12-character Git revision in `/opt/lclip/resources/LCLIP_BUILD`. The no-root installer records the tagged version in `~/.local/opt/lclip/resources/LCLIP_PORTABLE_INSTALL`, while a direct distribution package falls back to its application version. The main process exposes the available build identity only to the Settings integration card. This makes a stale resident process visible after reinstalling.

### Capture flow

1. Electron reads text from the standard clipboard.
2. Blank or unchanged text is ignored.
3. Text longer than 50,000 characters is truncated.
4. LClip records the capture time for each history entry.
5. A duplicate is removed from its old position.
5. The new entry is placed first.
6. Entries beyond number 10 are discarded.
7. A snapshot is queued for a temporary-file-plus-rename persistence write.
8. The UI receives the new public state with a saving indicator.
9. A later state broadcast reports either the confirmed save time or an observable storage error.

### Text activation flow

1. The renderer sends the selected text through IPC.
2. The main process validates and limits the string.
3. It writes the value to the system clipboard.
4. The value is also moved to the front of history.
5. The visible window yields focus and waits 150 milliseconds.
6. The paste bridge sends `Ctrl+V`; if it fails, the next detected bridge is attempted.
7. After an 80-millisecond focus-settling interval, LClip reopens and refocuses the existing picker for another selection.
8. If every bridge fails, LClip leaves the value copied, displays a notification, and shows a manual-paste instruction as a temporary in-window toast.

### GIF flow

1. The user enters an optional GIPHY API key in Settings.
2. The main process cancels any older in-flight search, then requests up to 24 search or trending results over HTTPS through a stream capped at 2 MB.
3. Preview and original URLs are revalidated against exact GIPHY host boundaries before the renderer displays GIPHY-hosted WebP previews.
4. Selecting a result sends its metadata to the main process.
5. The main process accepts only HTTPS hosts equal to `giphy.com` or ending in `.giphy.com`.
6. It revalidates redirects and content type, then downloads through a bounded stream with a 12-second timeout. The reader is cancelled immediately when accumulated data exceeds 15 MB.
7. It writes image, HTML, and URL representations to the clipboard.
8. It attempts automatic paste using the detected bridge.

## 6. Automatic-paste bridges

Writing to the clipboard and causing another app to paste are separate operations. Clipboard writing is a normal desktop API. Synthetic key input is security-sensitive.

### ydotool

`ydotool` can inject Linux input through the kernel's `uinput` mechanism and is LClip's first choice. Current ydotool versions require the `ydotoold` daemon or distribution-provided service and appropriate access to `/dev/uinput`. Installing the executable alone is not sufficient if the daemon or device permission is unavailable.

The `key` command changed incompatibly at ydotool 1.0:

- Ubuntu's ydotool 0.1.8 accepts symbolic combinations, so LClip invokes `ydotool key ctrl+v`.
- ydotool 1.x accepts Linux input-event codes, so LClip invokes `ydotool key 29:1 47:1 47:0 29:0`, where 29 is left Ctrl and 47 is V.

During detection, LClip inspects `ydotool --version` and `ydotool key --help`. An identified major version 1 or explicit key-code help selects numeric syntax; version 0 or unknown output selects the safer symbolic syntax. Using symbolic syntax on an incompatible modern client fails and permits bridge fallback, whereas sending numeric syntax to 0.1.8 can type unwanted digits while still exiting successfully.

### `/dev/uinput`, udev, and the `lclip-uinput` group

`/dev/uinput` is a special Linux device through which an authorized process can create a virtual keyboard or mouse. Access is security-sensitive because it permits synthetic input.

The optional installer flag `--configure-ydotool` performs a restricted setup:

1. Creates a system group named `lclip-uinput`.
2. Adds the current desktop user to that group.
3. Installs `/etc/udev/rules.d/80-lclip-uinput.rules`.
4. Assigns only `/dev/uinput` to that group with mode `0660`.
5. Installs `/etc/modules-load.d/lclip-uinput.conf`, loads the `uinput` kernel module, and reloads udev rules when those tools are available.
6. Installs the separate `ydotoold` package when a distribution splits the client and daemon.
7. Creates and enables `~/.config/systemd/user/lclip-ydotoold.service` using the detected daemon path.

Mode `0660` gives read/write access only to root and members of the dedicated group. It does not make the device world-writable. A full logout/login is required because an already-running graphical session does not acquire newly added group memberships.

Ubuntu 24.04 packages the `ydotool` command and `ydotoold` daemon separately. Merely finding `/usr/bin/ydotool` therefore does not prove that automatic paste can operate. The installer requires both commands in `--configure-ydotool` mode and supplies its own user service because some Ubuntu daemon packages contain only the executable.

### wtype

`wtype` is a Wayland typing tool that uses a compositor-supported virtual-keyboard protocol. It does not work on every Wayland compositor. LClip uses it only when `XDG_SESSION_TYPE` is `wayland` and `ydotool` is unavailable.

### xdotool

`xdotool` automates X11 input. It is a good X11 fallback. In Wayland it normally affects only Xwayland surfaces, so it may paste into one application and fail in another.

### Detection order

LClip searches each directory in `PATH` and builds an ordered candidate list:

1. `ydotool` on Linux;
2. `wtype` when the session is Wayland;
3. `xdotool` as the X11 or Xwayland fallback;
4. copy-only mode if none is available.

During activation, LClip attempts each candidate until one exits successfully. This matters when `ydotool` is installed but `ydotoold` is not ready, or when `wtype` is installed but unsupported by the current compositor. Settings shows the preferred detected bridge and active window backend; a failure also produces a desktop notification and temporary toast.

## 7. State and persistence

### State contents

The JSON state contains:

- `history`: up to 10 objects containing an ID, text, and creation time;
- `captureEnabled`: whether new clipboard text is collected;
- `autostartEnabled`: the UI's autostart setting;
- `giphyApiKey`: the optional API key;
- `gifRating`: `g`, `pg`, or `pg-13`.

Electron chooses the exact user-data directory. The code writes `state.json` beneath `app.getPath("userData")`. The Linux path is commonly under `~/.config/LClip/`, but capitalization or packaging can affect the exact location. The Settings page and troubleshooting commands should be used to confirm it on the target machine.

### Atomic write

LClip first writes a temporary file and then renames it over `state.json`. Rename is normally atomic on the same filesystem, reducing the chance of leaving a half-written JSON file after a crash or power loss.

### Permissions

The directory is created with mode `0700`, meaning only the owner can enter or list it. The state file is written with mode `0600`, meaning only the owner can read or modify it. These modes protect against other ordinary user accounts, but not against malware already running as the same user or an administrator.

Read, parse, permission, and write failures are exposed through the Settings storage row, an in-window toast, and a desktop notification. LClip keeps the current in-memory session usable rather than claiming that the failed change reached disk. Settings saves also restore the previous autostart file and in-memory settings when persistence fails, so operating-system behavior and the saved preference do not drift apart.

## 8. Security model

### Context isolation

`contextIsolation: true` separates Electron's privileged preload world from the web page's JavaScript world. Only values explicitly passed through `contextBridge` become visible to the renderer.

### Sandbox

`sandbox: true` applies Chromium renderer sandbox restrictions. The main process remains privileged enough to use Electron desktop APIs, so it must validate renderer requests.

Linux Electron bundles contain a helper named `chrome-sandbox`. For the set-user-ID sandbox path to be accepted, the installed helper must be owned by `root:root` and have mode `4755`. The system installer changes the complete `/opt/lclip` bundle to root ownership and explicitly applies `4755` to this helper. Running with `--no-sandbox` is not an acceptable replacement.

### Node integration

`nodeIntegration: false` prevents renderer scripts from directly using Node.js APIs such as filesystem access or process execution.

### Content Security Policy

The HTML includes a **Content Security Policy (CSP)**. It permits local scripts and styles, local/data images, and GIPHY images. It blocks renderer network connections, embedded objects, and arbitrary page navigation. Network requests are performed by the main process where inputs can be constrained.

### Secret limitations

The GIPHY key is stored in a file protected by filesystem permissions, not in an operating-system secret vault. That prevents casual access from other users but is not equivalent to encryption. Clipboard history is also sensitive by nature. A future version could use a desktop keyring for the API key and optional encrypted or memory-only history modes.

## 9. Packaging and installation vocabulary

### npm and package.json

**npm** installs JavaScript packages and runs named scripts. `package.json` describes LClip, pins development dependencies, and configures Electron Builder. `package-lock.json` records exact dependency versions for repeatable installs. LClip declares Node.js `>=22.12.0` because Electron 43 and its packaging dependencies do not support the Node.js 18 runtime commonly present in older Ubuntu repositories. `.nvmrc` selects Node 22 for developers using NVM.

`npm ci` performs a clean installation that exactly follows the lock file. It is preferred for installers and CI. `npm install` can update lock-file resolution and is used during development when dependencies change.

### Electron Builder

**electron-builder** packages source code, Electron, and application metadata into distributable Linux artifacts. The package records a real maintainer name and email for Debian/RPM metadata, and synchronizes `io.lclip.LClip.desktop` with Electron's Linux application ID and `StartupWMClass` so desktop shells can associate a running window with its launcher. LClip supports:

- **unpacked directory** — useful for system installation and inspection;
- **AppImage** — a portable executable image used by many Linux distributions;
- **DEB** — a package format used by Debian, Ubuntu, and related distributions;
- **RPM** — a package format used by Fedora, RHEL, openSUSE, and related systems;
- **tar.gz** — a FUSE-free portable runtime used by LClip's no-root installer.

### ASAR

**ASAR** is Electron's application archive format. The build places source assets into an archive to simplify distribution. It is packaging, not encryption; users can inspect an ASAR archive.

### Processor architecture

**x86-64** (`x86_64` or `amd64`) is common on Intel and AMD laptops. **ARM64** (`aarch64` or `arm64`) is used by some Linux laptops and single-board systems. Native GitHub runners build both architectures. The no-root installer detects `uname -m`, downloads the matching tar.gz archive, and verifies it against the release checksum manifest before extraction.

### `/opt` and `/usr/local/bin`

`/opt` is commonly used for self-contained third-party software. `/usr/local/bin` is commonly used for administrator-installed commands. LClip stores its bundle in `/opt/lclip` and installs a small launcher named `lclip` in `/usr/local/bin`.

### sudo

`sudo` runs an approved command with administrator privileges. LClip needs it to write system locations, but the installed app later runs as the normal desktop user.

### Installer modes

The stable release provides two installation families:

- `install-lclip.sh`: no-root, no-Node, FUSE-free installation below `~/.local`; it verifies release checksums and rolls back user integration on activation failure.
- `uninstall-lclip.sh`: removes only a marked per-user portable installation and preserves state unless `--purge-data` is explicit.
- `scripts/install-system.sh`: builds from source and integrates under `/opt`, optionally configuring native GNOME and restricted `ydotool` access.

- No option: builds, verifies, installs, and attempts best-effort bridge package/service setup.
- `--configure-ydotool`: additionally configures restricted `/dev/uinput` access for the current desktop user.
- `--skip-input-bridge`: installs LClip without installing or configuring input tools.
- `--help`: prints the supported choices without changing the system.

The installer rejects conflicting or unknown options. It must be invoked as the desktop user so `sudo` is used only for system file operations and the GNOME shortcut is written into the correct user's settings.

Before packaging, the installer removes `dist/` so an old unpacked bundle cannot be selected accidentally. After verification and packaging, it prepares a complete root-owned bundle at `/opt/lclip.new`, records the build marker, and backs up the existing launcher, desktop entry, icon, autostart file, and optional input-integration files. The resident process is then stopped and the previous application is moved to `/opt/lclip.rollback` before the staged bundle is activated. If activation or a required system-integration step fails, the error trap restores the previous bundle, backed-up integration files, user service, and prior group membership, then restarts the old resident process when it had been running. Packages installed through the operating system's package manager are deliberately not removed by rollback. The bundle copy is removed only after installation succeeds, then the new resident process starts in the current graphical session.

## 10. Tests and verification

`npm run verify` performs JavaScript syntax checking and runs Node's built-in test runner. Current tests verify:

- history never exceeds 10 items;
- recopying text moves it to the front without duplication;
- invalid and blank persisted values are discarded;
- `ydotool` is preferred;
- `wtype` is selected on Wayland when needed;
- missing bridges are reported as unavailable.
- paste falls back to the next candidate when the preferred bridge exits with an error.
- ydotool 0.x uses symbolic `ctrl+v` rather than the incompatible 1.x numeric event sequence.
- the offline emoji, kaomoji, and symbol catalogs meet their minimum sizes, contain searchable metadata, and do not duplicate values.
- Wayland sessions choose Xwayland only when it is available and the user has not requested native Wayland.

The current suite contains 31 automated tests covering state, persistence, autostart, IPC, GIPHY bounds and cancellation, release-asset assembly, the stable release contract, shortcut-status reporting, paste-bridge selection, backend decisions, and offline catalog counts. The asset-assembly test requires every public file, including the icon, to appear in the checksum manifest. CI additionally builds and launches the packaged runtime under Xvfb on native x86-64 and ARM64 runners. Tagged releases finish with native jobs that download the public installer, install it without root into an isolated home directory, launch the downloaded runtime, and exercise the public uninstaller. These checks do not fabricate portal approval, focus transfer, input injection, or window-drag evidence; real-desktop observations remain documented in `docs/linux-smoke-test.md`, while copy-first manual fallback is part of the stable contract.

## 11. License and copyleft

LClip's project code is licensed as `GPL-3.0-only`, the modern SPDX identifier for the GNU General Public License version 3 only. The repository includes the complete official GPLv3 text in `LICENSE`; `package.json` and the root entry in `package-lock.json` use the same identifier. Electron Builder's `extraResources` configuration also copies `LICENSE` into packaged applications so binary recipients receive it with the program.

GPLv3 is a **copyleft** free-software license. Users may run, inspect, study, modify, and redistribute LClip. When somebody distributes a modified covered version, they must preserve the license notices, provide the corresponding source under GPLv3, and give recipients the same freedoms. Merely making a private modification does not trigger a requirement to publish it. GPLv3 also differs from the GNU Affero GPL: operating a modified program only as a network service is not, by itself, GPLv3 distribution.

The license fields recorded under individual `node_modules` entries in `package-lock.json` describe third-party dependencies and remain under their respective MIT, BSD, Apache, ISC, or other licenses. Changing those entries would misrepresent their authors' licensing and is not part of relicensing LClip.

Authoritative references: [GNU GPL licenses](https://www.gnu.org/licenses/) and the [SPDX license list](https://spdx.org/licenses/).

## 12. Known boundaries

- Text history only; copied images and files are not retained as history entries.
- A maximum of 10 entries is intentional.
- The shortcut is fixed to `Super + .`.
- Automatic paste depends on an external bridge, its service/device permissions, and desktop security policy.
- A one-time Wayland permission request may be controlled by the desktop.
- GIFs require a GIPHY key, network access, and a target that accepts an image or HTML clipboard format.
- The tray icon may be hidden by GNOME without a tray extension.
- Clipboard history is protected by file permissions but is not encrypted.
- Prebuilt 1.0 binaries target current 64-bit glibc Linux; Alpine/musl and 32-bit systems are outside the published binary boundary.
- Real desktops remain the authority for portal approval, focus transfer, drag, and synthetic input; macOS and Xvfb validate only platform-neutral or packaged-startup behavior.

For symptom-based diagnosis and commands, continue with [troubleshooting.md](troubleshooting.md).
