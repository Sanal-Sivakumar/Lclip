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

**Xwayland** runs older X11 applications inside a Wayland session. An X11 automation tool may work with an Xwayland target but fail with a native Wayland application. Therefore `xdotool` on a Wayland session is reported as “Automatic paste · Xwayland”, not as universal Wayland support.

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

The script reads the current custom-keybinding array, preserves every existing entry, and adds LClip's dedicated path. It never binds `Ctrl+V`, `Super+V`, or an alternative chord. The uninstaller removes only LClip's binding path. Electron registration and the GNOME command can both call `showWindow`; repeated show requests are idempotent and do not toggle the picker closed.

### Clipboard and selection

The **clipboard** is a shared data exchange managed by the graphical session. Copy places one or more data formats on it; paste asks the focused application to read a format it understands.

Linux can also have a primary selection, commonly pasted with the middle mouse button. LClip reads Electron's normal `clipboard` selection, not the X11 primary selection. In the current version, history capture reads text only.

### Focus

The focused application receives keyboard input. When LClip opens, it temporarily becomes focused. Before automatic paste, it hides and waits 150 milliseconds so the previous application can become active again. This short delay reduces the chance that the generated paste is delivered to LClip itself.

## 3. Why LClip starts after login

There are two different meanings of “system integration”:

1. **System-wide installation** means files are installed in shared locations such as `/opt`, `/usr/local/bin`, and `/usr/share/applications`.
2. **User-session execution** means the process runs as the signed-in user and can communicate with that user's desktop.

LClip uses both. Its files are installed system-wide, but its process starts through `/etc/xdg/autostart` after graphical login. Starting it as a root daemon during boot would be technically wrong because there may be no graphical session yet, and root should not collect a user's copied secrets.

### XDG autostart

**XDG** refers to cross-desktop standards maintained under the freedesktop.org ecosystem. An XDG autostart `.desktop` file tells compatible desktops to launch an application after login.

The installer creates:

```text
/etc/xdg/autostart/io.lclip.LClip.desktop
```

This system entry executes:

```text
/usr/local/bin/lclip --hidden
```

Disabling autostart in LClip creates a user override at:

```text
~/.config/autostart/io.lclip.LClip.desktop
```

with `Hidden=true`. Enabling autostart removes that override, revealing the system entry again.

### `.desktop` file

A `.desktop` file is a small text manifest describing a graphical application: its name, executable command, icon, categories, and startup behavior. It is not the application itself.

## 4. Electron and the application architecture

### Electron

**Electron** is a framework for desktop applications built with web technology. It combines Chromium, which renders HTML and CSS, with Node.js, which can access operating-system facilities. LClip uses Electron 43.1.1.

Electron applications usually have multiple processes:

- The **main process** controls application lifetime and privileged desktop APIs.
- The **renderer process** displays the interface using HTML, CSS, and JavaScript.
- A **preload script** exposes a deliberately limited bridge between them.

This separation prevents UI code from receiving unrestricted filesystem or process access.

### Main process

`src/main/main.mjs` is the entry point. It:

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

`src/renderer/index.html`, `styles.css`, and `app.js` create the interface. The renderer contains the built-in emoji, kaomoji, and symbol data. It filters lists, responds to mouse and keyboard navigation, displays status, and asks the main process to perform privileged actions.

The renderer cannot import Node.js modules because `nodeIntegration` is disabled.

### Preload and context bridge

`src/preload/preload.cjs` runs in a special isolated context. It creates a small `window.lclip` API with functions such as `bootstrap`, `activate`, `clearHistory`, `saveSettings`, and `searchGifs`.

This is safer than exposing all of Electron. The renderer can request an approved action but cannot execute an arbitrary system command.

### IPC

**IPC** means inter-process communication. Electron's `ipcRenderer` sends a named message from the UI; `ipcMain` handles it in the main process. LClip uses explicit channel names beginning with `lclip:`. Examples include `lclip:activate` and `lclip:search-gifs`.

### BrowserWindow

The picker is an Electron `BrowserWindow` configured as frameless, transparent, always on top, absent from the taskbar, visible on every workspace, and hidden when it loses focus. The visual “glass” comes from translucent CSS layers, borders, shadows, and blur-capable compositing. Actual appearance can differ with compositor support, GPU drivers, and accessibility settings.

The first show request is held until Electron emits `ready-to-show`, which avoids exposing a partially loaded window. LClip centers the picker once per running process. A visible six-dot region uses Electron's `-webkit-app-region: drag` behavior; after the user drags the window, later openings preserve that position instead of forcing it back to the center.

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

### Capture flow

1. Electron reads text from the standard clipboard.
2. Blank or unchanged text is ignored.
3. Text longer than 50,000 characters is truncated.
4. A duplicate is removed from its old position.
5. The new entry is placed first.
6. Entries beyond number 10 are discarded.
7. A snapshot is atomically persisted to disk.
8. The UI receives the new public state.

### Text activation flow

1. The renderer sends the selected text through IPC.
2. The main process validates and limits the string.
3. It writes the value to the system clipboard.
4. The value is also moved to the front of history.
5. The window hides and waits 150 milliseconds.
6. The paste bridge sends `Ctrl+V`; if it fails, the next detected bridge is attempted.
7. If every bridge fails, LClip leaves the value copied, displays a notification, and records “Copied · press Ctrl+V to paste” for the status bar.

### GIF flow

1. The user enters an optional GIPHY API key in Settings.
2. The main process requests up to 24 search or trending results over HTTPS.
3. The renderer displays GIPHY-hosted WebP previews.
4. Selecting a result sends its metadata to the main process.
5. The main process accepts only HTTPS hosts equal to `giphy.com` or ending in `.giphy.com`.
6. It downloads the original with a 12-second timeout and a 15 MB limit.
7. It writes image, HTML, and URL representations to the clipboard.
8. It attempts automatic paste using the detected bridge.

## 6. Automatic-paste bridges

Writing to the clipboard and causing another app to paste are separate operations. Clipboard writing is a normal desktop API. Synthetic key input is security-sensitive.

### ydotool

`ydotool` can inject Linux input through the kernel's `uinput` mechanism and is LClip's first choice. Current ydotool versions require the `ydotoold` daemon or distribution-provided service and appropriate access to `/dev/uinput`. LClip sends Linux key codes 29 and 47 for Ctrl and V. Installing the executable alone is not sufficient if the daemon or device permission is unavailable.

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

During activation, LClip attempts each candidate until one exits successfully. This matters when `ydotool` is installed but `ydotoold` is not ready, or when `wtype` is installed but unsupported by the current compositor. The status bar and Settings show the preferred detected result, while the latest activation outcome reports whether paste actually succeeded.

## 7. State and persistence

### State contents

The JSON state contains:

- `history`: up to 10 objects containing an ID, text, and creation time;
- `captureEnabled`: whether new clipboard text is collected;
- `autostartEnabled`: the UI's autostart setting;
- `closeAfterPaste`: reserved behavior currently saved as true;
- `giphyApiKey`: the optional API key;
- `gifRating`: `g`, `pg`, or `pg-13`.

Electron chooses the exact user-data directory. The code writes `state.json` beneath `app.getPath("userData")`. The Linux path is commonly under `~/.config/LClip/`, but capitalization or packaging can affect the exact location. The Settings page and troubleshooting commands should be used to confirm it on the target machine.

### Atomic write

LClip first writes a temporary file and then renames it over `state.json`. Rename is normally atomic on the same filesystem, reducing the chance of leaving a half-written JSON file after a crash or power loss.

### Permissions

The directory is created with mode `0700`, meaning only the owner can enter or list it. The state file is written with mode `0600`, meaning only the owner can read or modify it. These modes protect against other ordinary user accounts, but not against malware already running as the same user or an administrator.

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

**electron-builder** packages source code, Electron, and application metadata into distributable Linux artifacts. LClip supports:

- **unpacked directory** — useful for system installation and inspection;
- **AppImage** — a portable executable image used by many Linux distributions;
- **DEB** — a package format used by Debian, Ubuntu, and related distributions;
- **RPM** — a package format used by Fedora, RHEL, openSUSE, and related systems.

### ASAR

**ASAR** is Electron's application archive format. The build places source assets into an archive to simplify distribution. It is packaging, not encryption; users can inspect an ASAR archive.

### Processor architecture

**x86-64** (`x86_64` or `amd64`) is common on Intel and AMD laptops. **ARM64** (`aarch64` or `arm64`) is used by some Linux laptops and single-board systems. The installer detects `uname -m` and finds the matching Electron Builder output.

### `/opt` and `/usr/local/bin`

`/opt` is commonly used for self-contained third-party software. `/usr/local/bin` is commonly used for administrator-installed commands. LClip stores its bundle in `/opt/lclip` and installs a small launcher named `lclip` in `/usr/local/bin`.

### sudo

`sudo` runs an approved command with administrator privileges. LClip needs it to write system locations, but the installed app later runs as the normal desktop user.

### Installer modes

- No option: builds, verifies, installs, and attempts best-effort bridge package/service setup.
- `--configure-ydotool`: additionally configures restricted `/dev/uinput` access for the current desktop user.
- `--skip-input-bridge`: installs LClip without installing or configuring input tools.
- `--help`: prints the supported choices without changing the system.

The installer rejects conflicting or unknown options. It must be invoked as the desktop user so `sudo` is used only for system file operations and the GNOME shortcut is written into the correct user's settings.

## 10. Tests and verification

`npm run verify` performs JavaScript syntax checking and runs Node's built-in test runner. Current tests verify:

- history never exceeds 10 items;
- recopying text moves it to the front without duplication;
- invalid and blank persisted values are discarded;
- `ydotool` is preferred;
- `wtype` is selected on Wayland when needed;
- missing bridges are reported as unavailable.
- paste falls back to the next candidate when the preferred bridge exits with an error.

The current suite contains seven tests. These are unit tests. They do not prove end-to-end integration with every GNOME, KDE, Wayland, X11, portal, input bridge, target application, display scale, or distribution. A Linux test matrix is still required for release confidence.

## 11. Known boundaries

- Text history only; copied images and files are not retained as history entries.
- A maximum of 10 entries is intentional.
- The shortcut is fixed to `Super + .`.
- Automatic paste depends on an external bridge, its service/device permissions, and desktop security policy.
- A one-time Wayland permission request may be controlled by the desktop.
- GIFs require a GIPHY key, network access, and a target that accepts an image or HTML clipboard format.
- The tray icon may be hidden by GNOME without a tray extension.
- Clipboard history is protected by file permissions but is not encrypted.
- Linux integration has to be verified on real target systems; macOS can validate only platform-neutral parts.

For symptom-based diagnosis and commands, continue with [troubleshooting.md](troubleshooting.md).
