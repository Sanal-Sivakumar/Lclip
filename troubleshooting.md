# LClip Troubleshooting

This document records the important development problems addressed in LClip and provides a practical diagnostic guide for installation and runtime failures.

## Problems encountered and their status

| Observed problem | Root cause | Implemented resolution |
| --- | --- | --- |
| Old launcher requested `.venv/bin/python3` | Legacy Python installation remained earlier in `PATH` | Current Electron installer replaces `/usr/local/bin/lclip`; troubleshooting identifies additional stale launchers |
| `npm WARN EBADENGINE` followed by `ERR_REQUIRE_ESM` | Ubuntu Node.js 18 was too old for Electron 43 | Node `>=22.12.0`, `.nvmrc`, package engine declaration, and installer preflight check |
| Electron aborted on `chrome-sandbox` | Helper ownership/mode was unsafe after copying | Installer applies `root:root` ownership and mode `4755` |
| `Super + .` did not open the picker | Electron/Wayland portal registration was unavailable or conflicted | GNOME-native custom shortcut plus Electron registration of the same chord |
| First opening felt slow | Full Electron cold start was visible | Window remains hidden until `ready-to-show`; login autostart keeps a warm resident process |
| Picker disappeared after selection | It hides intentionally to restore previous-app focus | Persistent process, reliable shortcut reopening, notification, and recorded paste outcome |
| “Automatic paste is unavailable” | Bridge executable existed but its service/protocol/device permission failed | Ordered bridge fallback and optional restricted `ydotool` `/dev/uinput` configuration |
| Window was difficult to move and re-centered | Search covered most of the drag region; every show repositioned it | Visible six-dot drag handle and one-time centering per process |

## 1. Quick diagnosis

Run these commands from a Linux terminal:

```bash
printf 'Session: %s\nDesktop: %s\n' "$XDG_SESSION_TYPE" "$XDG_CURRENT_DESKTOP"
command -v lclip
pgrep -a lclip
command -v ydotool || true
command -v wtype || true
command -v xdotool || true
groups
ls -l /dev/uinput 2>/dev/null || true
systemctl --user status ydotool.service --no-pager 2>/dev/null || true
systemctl --user status ydotoold.service --no-pager 2>/dev/null || true
systemctl --user status lclip-ydotoold.service --no-pager 2>/dev/null || true
ls -l /etc/xdg/autostart/io.lclip.LClip.desktop
ls -l ~/.config/autostart/io.lclip.LClip.desktop 2>/dev/null || true
```

Interpretation:

- No output from `command -v lclip` means the launcher is not installed or is outside `PATH`.
- No output from `pgrep -a lclip` means LClip is not running.
- `XDG_SESSION_TYPE=wayland` means Wayland security and portal behavior apply.
- A user autostart file containing `Hidden=true` means “Start after login” is disabled.
- No input-bridge command means selection will copy successfully but cannot automatically send `Ctrl+V`.
- On a `--configure-ydotool` installation, `groups` should include `lclip-uinput` after logout/login.
- `/dev/uinput` should show group `lclip-uinput` and group read/write permission.

## 2. Development problem log

This section distinguishes solved design problems from environment-dependent limitations. It does not invent error messages that were not captured during development.

### Problem: the project must not interfere with normal copy and paste

**Risk:** A clipboard utility can be mistaken for a keyboard listener or can accidentally claim `Ctrl+C`, `Ctrl+V`, or `Super+V`.

**Implemented solution:** LClip registers only `Super + .`. Clipboard capture uses Electron's clipboard API, and automatic paste invokes the normal `Ctrl+V` action only after the user chooses an item. Normal application copy and paste remain unchanged.

### Problem: the shortcut must work globally without keylogging

**Risk:** Listening to every keystroke is invasive, harder to secure, and restricted by Wayland.

**Implemented solution:** LClip uses Electron's global-shortcut registration. The operating system matches one exact chord and calls LClip only when that chord is pressed. Wayland portal features are enabled for compatible desktops.

### Problem: “start with the OS” conflicts with graphical-session ownership

**Risk:** A root boot daemon starts before a user desktop exists, cannot reliably access that user's clipboard or focus, and would process sensitive clipboard data with unnecessary privilege.

**Implemented solution:** Install application files system-wide under `/opt/lclip`, but start the process as the logged-in user through `/etc/xdg/autostart`. This provides OS-like availability without a privileged clipboard daemon.

### Problem: Wayland deliberately restricts synthetic paste

**Risk:** One paste tool cannot work on every compositor and application. Claiming universal support would be misleading.

**Implemented solution:** LClip detects `ydotool`, then Wayland-compatible `wtype`, then X11/Xwayland `xdotool`, and tries the next candidate when one fails. The optional `--configure-ydotool` installer mode creates restricted `/dev/uinput` access. If no bridge succeeds, LClip keeps the selection on the clipboard and tells the user to press `Ctrl+V`.

### Problem: the selected value could paste back into LClip

**Risk:** The picker owns focus while the user selects an item.

**Implemented solution:** LClip hides the window, waits 150 milliseconds for focus to return, and only then invokes the bridge. GIF activation uses a 180-millisecond wait.

### Problem: clipboard history can grow indefinitely or contain duplicates

**Risk:** Unlimited history wastes storage, increases privacy exposure, and becomes difficult to navigate.

**Implemented solution:** History normalization removes blanks and duplicates, truncates individual text to 50,000 characters, moves recopied text to the front, and enforces a strict maximum of 10 entries.

### Problem: state corruption during a write

**Risk:** A crash during direct JSON writing can leave a partial file.

**Implemented solution:** LClip writes a temporary state file and renames it over the old file. Writes are queued, the directory uses permission `0700`, and the final file uses `0600`.

### Problem: a second process can register a duplicate shortcut or monitor

**Risk:** Multiple instances can compete for the shortcut, duplicate clipboard capture, and show multiple tray icons.

**Implemented solution:** Electron's single-instance lock allows one LClip process. Starting LClip again tells the existing instance to show its window unless the invocation is explicitly hidden.

### Problem: renderer code must not receive unrestricted system access

**Risk:** The interface displays remote GIF images. A renderer compromise must not become arbitrary command execution.

**Implemented solution:** Node integration is disabled, context isolation and sandboxing are enabled, preload exposes a narrow IPC API, navigation is blocked, external URLs are restricted, and the Content Security Policy prevents arbitrary renderer connections and scripts.

### Problem: GIF content is remote and untrusted

**Risk:** A malicious or unexpected URL could make LClip download arbitrary hosts or very large data.

**Implemented solution:** Only HTTPS GIPHY hosts are accepted, requests have timeouts, downloads are capped at 15 MB, and the API key and rating are validated before use.

### Problem: Linux packages must support multiple processor types

**Risk:** Electron Builder gives x86-64 and ARM64 unpacked output different names.

**Implemented solution:** The installer reads `uname -m`, chooses the expected directory, and has a controlled fallback search for a `linux*-unpacked` bundle.

### Problem: development happens on a Mac but the product targets Linux

**Risk:** A successful renderer preview, syntax check, or unit test on macOS can create false confidence about GNOME, KDE, Wayland, autostart, and input injection.

**Implemented solution:** The installer refuses to run outside Linux. Documentation marks Linux integration as requiring real-device verification. Platform-neutral tests remain runnable on macOS.

## 3. Installation failures

### `LClip's system installer must be run on Linux.`

**Cause:** `scripts/install-system.sh` was executed on macOS or another non-Linux system.

**Solution:** Push or copy the repository to the Linux laptop, clone it there, and run the installer from Linux. Building documentation or reviewing the UI on macOS is supported; system installation is not.

### `sudo is required for a system-wide install.`

**Cause:** The current user is not root and `sudo` is unavailable.

**Solution:** Install/configure `sudo`, use an administrator account, or run the installer as root from a trusted local checkout. Do not modify the script to silently install shared files without authorization.

### `npm: command not found`, `npm WARN EBADENGINE`, or Node is too old

**Cause:** Node.js and npm are build dependencies, not bundled in the source repository.

Electron 43 and its current packaging dependencies require Node.js 22.12.0 or newer. Ubuntu's Node.js 18 package is too old even though LClip's syntax checks and unit tests may still pass with it.

**Solution:** Install Node.js 22 using the distribution's supported package source or a trusted Node version manager. Confirm:

```bash
node --version
npm --version
```

Then rerun the installer.

### `Error [ERR_REQUIRE_ESM]` from `@noble/hashes/blake2.js`

**Cause:** The transcript that produced this error used Node.js `18.19.1` with Electron 43 and electron-builder dependencies that declare Node.js `22.12.0` or newer. Dependency installation emitted `npm WARN EBADENGINE`, tests happened to pass, and packaging then failed before `/opt/lclip` or the new launcher could be installed.

**Solution:** Upgrade to Node.js 22.12.0 or newer, remove the dependency directory installed by the incompatible runtime, and rerun the current installer:

```bash
cd ~/Documents/Lclip
node --version
rm -rf node_modules
npm ci
./scripts/install-system.sh
```

Do not edit `node_modules/app-builder-lib/out/targets/blockmap/blockmap.js` or convert its `require()` call manually. That would modify generated dependency code while leaving the unsupported Node runtime in place.

### `npm ci` reports lock-file or dependency errors

**Cause:** `package.json` and `package-lock.json` may be inconsistent, the npm cache may be corrupt, or the network/registry may be unavailable.

**Solution:** From a clean repository checkout:

```bash
git status
npm cache verify
npm ci
```

Do not delete or regenerate `package-lock.json` merely to hide a failure. If dependencies were intentionally changed, run `npm install`, inspect the lock-file change, run `npm run verify`, and commit both manifest files.

### Native package build fails on macOS

**Cause:** `npm run dist:linux` may require Linux packaging tools and produces artifacts that still need Linux testing.

**Solution:** Use the GitHub Actions release workflow or build on a Linux machine. Treat cross-built artifacts as unverified until installed and tested on Linux.

### `The packaged Linux application was not found.`

**Cause:** `npm run pack:linux` failed, produced output for an unexpected architecture, or the expected directory under `dist/` is missing.

**Solution:** Inspect the preceding Electron Builder error, then run:

```bash
uname -m
find dist -maxdepth 2 -type f -name lclip -o -type d -name 'linux*-unpacked'
npm run pack:linux
```

Do not manually copy an artifact for a different processor architecture.

### Package manager cannot find `ydotool`, `wtype`, or `xdotool`

**Cause:** Tool availability varies by distribution and enabled repositories.

**Solution:** Let installation finish; bridge installation is best-effort. Install a supported bridge from the distribution's trusted repositories, or rerun with `--skip-input-bridge` and configure one manually. LClip will work in copy-only mode without a bridge.

### Permission denied while installing under `/opt` or `/usr`

**Cause:** Administrator authorization failed, the filesystem is read-only, or security policy blocks writes.

**Solution:** Confirm `sudo` works and the root filesystem is writable. Do not use `chmod 777`. Fix the administrator or filesystem problem, then rerun the installer, which uses explicit safe modes.

## 4. Startup and process failures

### `FATAL:sandbox/linux/suid/client/setuid_sandbox_host.cc:166`

The complete message says that `/opt/lclip/chrome-sandbox` must be owned by root and have mode `4755`.

**Cause:** Electron uses a small set-user-ID sandbox helper on Linux. The custom system installer copied the unpacked Electron bundle while preserving the build user's ownership. Chromium refuses to start when this security-sensitive helper exists with unsafe ownership or permissions.

**Immediate repair:**

```bash
sudo chown root:root /opt/lclip/chrome-sandbox
sudo chmod 4755 /opt/lclip/chrome-sandbox
ls -l /opt/lclip/chrome-sandbox
/usr/local/bin/lclip --show
```

The permission display should begin with `-rwsr-xr-x` and show owner and group `root root`. Mode `4755` means the owner can execute the helper with the owner's identity while other users can only read and execute it.

**Permanent installer solution:** After moving the application into `/opt/lclip`, the installer changes the entire bundle to `root:root` ownership and explicitly applies mode `4755` to `chrome-sandbox`.

Do not work around this error with `--no-sandbox`, and do not apply `chmod 777`. Disabling Chromium's sandbox weakens LClip's renderer security; world-writable sandbox files are unsafe.

### `Lclip virtual environment python not found at .../.venv/bin/python3`

**Cause:** The shell is executing a launcher left behind by LClip's older Python implementation. The current LClip is an Electron application and does not use Python or a `.venv` directory. Pulling the new GitHub source does not automatically replace an old system launcher in `/usr/local/bin`.

**Confirm the stale launcher:**

```bash
type -a lclip
command -v lclip
sed -n '1,20p' "$(command -v lclip)"
```

If that file refers to `.venv/bin/python3`, remove only the old launcher, update the repository, and run the current installer:

```bash
cd ~/Documents/Lclip
git fetch origin
git pull --ff-only origin main
sudo rm -f /usr/local/bin/lclip
chmod +x scripts/install-system.sh scripts/uninstall-system.sh
./scripts/install-system.sh
hash -r
lclip --show
```

The new `/usr/local/bin/lclip` should contain an `exec /opt/lclip/lclip "$@"` command. If the current installer failed before its installation phase, an old launcher elsewhere in `PATH` can remain active. Check every match with `type -a lclip`, including `~/.local/bin/lclip`. If `git pull --ff-only` refuses because the checkout has local modifications, preserve those changes with a commit or backup before updating; do not use a destructive reset merely to bypass the warning.

### `/usr/local/bin/lclip --show` opens Electron, but `lclip --show` requests Python

**Cause:** The system launcher is correct, but the shell finds a legacy user launcher, alias, or function first. Directories such as `~/.local/bin` commonly appear before `/usr/local/bin` in `PATH`. Clearing the shell command hash does not change that ordering.

**Identify every definition:**

```bash
type -a lclip
command -V lclip
```

Inspect each file reported before `/usr/local/bin/lclip`. Remove or rename it only when its content refers to the obsolete `.venv/bin/python3` implementation. Common locations are:

```bash
grep -n '\.venv/bin/python3' ~/.local/bin/lclip ~/bin/lclip 2>/dev/null || true
rm -f ~/.local/bin/lclip ~/bin/lclip
unalias lclip 2>/dev/null || true
unset -f lclip 2>/dev/null || true
hash -r
```

Verify that the selected command and installed launcher are now correct:

```bash
command -v lclip
sed -n '1,10p' /usr/local/bin/lclip
lclip --show
```

`command -v lclip` should print `/usr/local/bin/lclip`, and that launcher should execute `/opt/lclip/lclip "$@"`.

### `lclip: command not found`

**Cause:** The launcher was not installed or `/usr/local/bin` is not in the shell's `PATH`.

**Checks:**

```bash
ls -l /usr/local/bin/lclip
printf '%s\n' "$PATH"
```

**Solution:** Rerun the installer. If the launcher exists, add `/usr/local/bin` through the shell's normal configuration or execute `/usr/local/bin/lclip --show` directly.

### LClip does not start after login

**Possible causes:** The system autostart file is missing, autostart is disabled by a per-user override, the desktop is not listed by the entry, or LClip crashes at startup.

**Checks:**

```bash
cat /etc/xdg/autostart/io.lclip.LClip.desktop
cat ~/.config/autostart/io.lclip.LClip.desktop 2>/dev/null || true
pgrep -a lclip
/usr/local/bin/lclip --show
```

If the user override contains `Hidden=true`, enable “Start after login” in Settings or remove only that override:

```bash
rm ~/.config/autostart/io.lclip.LClip.desktop
```

Then log out and back in. If the desktop is not listed in `OnlyShowIn`, manual startup may work but the installer needs an explicit compatibility update for that environment.

### Running `lclip --show` seems to do nothing

**Cause:** An existing process may own the single-instance lock, the window may be on another workspace/display, or Electron may have failed before the renderer loaded.

**Checks:**

```bash
pgrep -a lclip
pkill -x lclip
lclip --show
```

Use `pkill` only when it is acceptable to stop the current LClip process. Restarting does not intentionally delete history.

### The first window is slow, but later openings should be fast

**Cause:** The first command starts the full Electron process and loads the renderer. LClip is designed to remain resident after graphical login; later `lclip --show` requests are forwarded to the existing process and should be much faster.

**Solution:** Keep “Start after login” enabled. The window now waits until its renderer is ready before becoming visible, preventing a blank partial launch. Confirm that the resident process remains alive after hiding the picker:

```bash
pgrep -a lclip
time /usr/local/bin/lclip --show
```

If every launch is cold, inspect whether a desktop cleanup tool is killing background processes or whether LClip is crashing after the window hides.

### Tray icon is missing on GNOME

**Cause:** GNOME Shell does not always display traditional tray icons without an AppIndicator/status-icon extension.

**Solution:** Use `Super + .` or `lclip --show`; core operation does not require the tray. If a tray is desired, install and enable the trusted AppIndicator extension supplied or recommended by the distribution.

## 5. Shortcut failures

### `Super + .` does not open LClip

First confirm LClip is running:

```bash
pgrep -a lclip
lclip --show
```

Then open LClip Settings and read the integration card. If it says “Shortcut unavailable”, likely causes are:

- the desktop or another application already owns `Super + .`;
- the Wayland shortcut portal is unavailable or denied;
- an Electron/portal combination does not support the request;
- the keyboard layout maps the period key differently;
- LClip started outside the graphical environment and lacks session variables.

**Solutions:**

1. Search the desktop's keyboard-shortcut settings for `Super + .` and remove the conflict.
2. Restart LClip from inside the graphical session.
3. Log out and back in after portal or desktop updates.
4. On GNOME/KDE Wayland, ensure the distribution's XDG Desktop Portal and correct desktop backend are installed and running.
5. If the portal presents a one-time request, approve only the declared `Super + .` shortcut.

LClip intentionally does not fall back to `Super+V`, `Ctrl+V`, or another chord.

On GNOME, the system installer also creates a native custom shortcut whose command is `/usr/local/bin/lclip --show` and whose binding is `<Super>period`. This provides an operating-system binding when Electron's Wayland portal registration is unavailable. Reinstall from an active GNOME session to configure it, or run:

```bash
node scripts/configure-gnome-shortcut.mjs
```

### The shortcut works on X11 but not Wayland

**Cause:** X11 permits direct global grabs, while Wayland delegates policy to the compositor and portals.

**Solution:** Confirm the session and desktop, update the desktop's portal packages through the distribution, and inspect Settings. Do not grant LClip access to all keystrokes; it is designed to request one chord only.

### The desktop asks permission once

**Cause:** This is normal Wayland security behavior on desktops using the Global Shortcuts portal.

**Solution:** Approve the exact shortcut if you trust this installation. The desktop, not LClip, decides whether and how long the approval is remembered. Repeated prompts may indicate that portal state is not persisting, the app identity changed between builds, or the portal backend is malfunctioning.

## 6. Clipboard-history failures

### Copied text does not appear

**Checks:**

- Confirm “Capture copied text” is enabled.
- Confirm the tray action says “Pause clipboard capture”, which means capture is currently active.
- Copy non-empty plain text and wait at least 350 milliseconds.
- Restart LClip and try again.

LClip does not currently record copied files or general image history. Some password managers and security-sensitive applications may use protected clipboard behavior or clear content quickly.

### Only 10 items remain

This is intentional. LClip enforces a maximum of 10 entries for privacy and simplicity.

### A duplicate item disappeared from its old position

This is intentional. Copying identical text moves one copy to the front instead of storing duplicates.

### Very long text is shortened

This is intentional. Each stored or activated text value is limited to 50,000 characters.

### History is lost after a crash or restart

Locate the state file:

```bash
find ~/.config -maxdepth 3 -type f -name state.json -path '*LClip*' -print
```

Check ownership and mode:

```bash
ls -l ~/.config/LClip/state.json 2>/dev/null || true
```

The file should belong to the current user and normally have mode `-rw-------`. A malformed JSON file is ignored during load so LClip can still start. Preserve a copy for diagnosis before deleting it. Correct ownership rather than running LClip as root.

## 7. Automatic-paste failures

### Notification: “Automatic paste is unavailable. Press Ctrl+V to paste it.”

This notification means clipboard writing succeeded but every available synthetic-input bridge failed. It does **not** mean that the selected history item was lost. Press normal `Ctrl+V` immediately in the previous application to confirm the value is present.

**Checks:**

```bash
echo "$XDG_SESSION_TYPE"
command -v ydotool || true
command -v wtype || true
command -v xdotool || true
```

For a GNOME/KDE Wayland laptop, apply the supported LClip setup:

```bash
cd ~/Documents/Lclip
pkill -x lclip 2>/dev/null || true
./scripts/install-system.sh --configure-ydotool
```

Then **log out of the entire Linux desktop and log back in**. Do not merely close the terminal. Verify:

```bash
groups | tr ' ' '\n' | grep '^lclip-uinput$'
ls -l /dev/uinput
systemctl --user status ydotool.service --no-pager 2>/dev/null || \
  systemctl --user status ydotoold.service --no-pager 2>/dev/null || \
  systemctl --user status lclip-ydotoold.service --no-pager
/usr/local/bin/lclip --show
```

Expected signals:

- the current user belongs to `lclip-uinput`;
- `/dev/uinput` has group `lclip-uinput` and mode equivalent to `0660`;
- a `ydotool` or `ydotoold` user service is active, when supplied by the distribution.
- otherwise, the installer-created `lclip-ydotoold.service` is active.

The picker intentionally hides before attempting paste so focus can return to the previous application. After a failed attempt, the status changes to “Copied · press Ctrl+V to paste” and a desktop notification is shown. The LClip process remains running and can be reopened with `Super + .` or `lclip --show`.

### `ydotool` is installed but paste fails

**Possible causes:** The daemon/service is not running, `/dev/uinput` is unavailable, the user lacks appropriate access, or distribution packaging uses a different service arrangement.

**Checks:**

```bash
systemctl status ydotool.service 2>/dev/null || true
systemctl --user status ydotool.service 2>/dev/null || true
systemctl --user status ydotoold.service 2>/dev/null || true
systemctl --user status lclip-ydotoold.service 2>/dev/null || true
groups
ls -l /dev/uinput 2>/dev/null || true
```

**Solution:** Rerun `./scripts/install-system.sh --configure-ydotool`, log out, and log back in. Avoid running the entire LClip application as root. Do not use `chmod 666 /dev/uinput`; LClip's rule grants access only to `root` and the dedicated `lclip-uinput` group. Restart LClip after the bridge becomes available because bridge detection happens at application startup.

### `/dev/uinput` is correct, but no `ydotool` service exists

**Cause:** Ubuntu 24.04 packages `ydotool` and `ydotoold` separately, and the daemon package may provide the executable without a user systemd unit. The `ydotool` command alone cannot maintain the persistent virtual input device required for reliable operation.

**Solution:** Current `--configure-ydotool` installation installs the daemon package and creates `~/.config/systemd/user/lclip-ydotoold.service`. After updating the repository:

```bash
cd ~/Documents/Lclip
git pull --ff-only origin main
./scripts/install-system.sh --configure-ydotool
sudo reboot
```

After login:

```bash
groups | tr ' ' '\n' | grep '^lclip-uinput$'
systemctl --user status lclip-ydotoold.service --no-pager
```

### `wtype` is installed but does not work

**Cause:** The current Wayland compositor may not support the virtual-keyboard protocol used by `wtype`, or policy may deny it.

**Solution:** Try a correctly configured `ydotool`; otherwise use manual `Ctrl+V`. Installing `wtype` cannot force a compositor to implement or allow its protocol.

### `xdotool` works in one app but not another on Wayland

**Cause:** The working target is probably an Xwayland application while the failing target is native Wayland.

**Solution:** Use `ydotool` if appropriate for the system, use a compositor-supported bridge, or paste manually. For a controlled comparison, log into an X11 session and test again.

### Paste is delivered to the wrong window

**Cause:** Focus did not return quickly enough, another notification/window took focus, or the desktop has unusual focus behavior.

**Workaround:** Select the item, then paste manually. For development, adjust and test the delay cautiously; increasing it makes pasting slower and does not guarantee correctness across every compositor.

### The picker cannot be moved or returns to the center

**Cause:** Earlier builds left only a very narrow draggable area around the search field and recalculated the centered position every time the picker opened.

**Solution:** Current builds include a six-dot drag handle to the left of Search. Hold and drag that handle. LClip centers itself only for its first opening in a process and preserves the user-selected position afterward.

### Automatic paste suddenly stopped after installing a bridge

**Cause:** LClip detects bridges once during startup.

**Solution:** Quit and restart LClip:

```bash
pkill -x lclip
lclip --show
```

## 8. GIF failures

### “Connect GIPHY to search GIFs”

**Cause:** No API key is stored.

**Solution:** Obtain a key from GIPHY Developers, add it in Settings, choose a rating, and save. Other LClip features do not need a key.

### “GIF search is unavailable”

**Possible causes:** Invalid/revoked API key, no network connection, DNS or proxy failure, GIPHY service error, or the 10-second request timeout.

**Checks:** Verify general HTTPS connectivity and re-enter the key carefully. Do not publish the key in GitHub issues, screenshots, terminal output, or repository files.

### GIF preview appears but selection fails

**Possible causes:** The original download exceeded 15 MB, took longer than 12 seconds, returned an error, or used an unsupported host.

**Solution:** Choose a different GIF. The host and size restrictions are security controls and should not be removed just to accept one result.

### The target pastes a URL instead of an animated image

**Cause:** Clipboard format support is chosen by the target application. Plain-text editors do not accept image data; some chat clients ignore HTML or animated clipboard images.

**Solution:** Test in an application known to accept pasted images. If it still pastes only the URL, use the target application's upload feature. LClip cannot force an application to accept a format it does not support.

## 9. UI and graphics failures

### Transparent window is black, opaque, or visually different

**Possible causes:** Compositor transparency limitations, GPU acceleration problems, remote desktop, virtual machine graphics, accessibility settings, or a different desktop theme.

**Solution:** Update graphics drivers and test in a normal local compositor session. The interface remains usable without perfect blur. Do not disable Electron's sandbox as a graphics workaround.

### Window immediately disappears

**Cause:** LClip intentionally hides when it loses focus. Clicking another window, opening some system overlays, or a focus-stealing process can trigger this.

**Solution:** Press `Super + .` again and interact directly with the picker. During development, use `npm run dev`; DevTools are exempted from the normal blur-to-hide behavior.

### Keyboard navigation does not reach an expected item

**Cause:** Search/category filters may have removed it, or focus may be inside Settings.

**Solution:** Clear the search, choose the `All` category, close Settings, and retry. Use `Esc` to close the picker or settings surface as appropriate.

## 10. Development and test failures

### `npm run verify` fails at `node --check`

**Cause:** A JavaScript syntax error exists in one of the main, preload, or renderer files.

**Solution:** Read the reported filename and line, correct the syntax, and rerun `npm run verify`. Do not skip the check in CI.

### A history test fails

**Cause:** Changes altered the maximum, ordering, deduplication, blank filtering, or timestamp behavior.

**Solution:** Compare the change with the product requirement: maximum 10 copied text entries, newest first, no duplicates, no blanks. Update tests only if the requirement intentionally changes.

### A bridge-selection test fails

**Cause:** Detection priority changed or test executables are no longer recognized.

**Solution:** Preserve the intended order (`ydotool`, Wayland `wtype`, `xdotool`, unavailable) unless a researched platform decision changes it. Add a test for every new branch.

### Works in browser preview but not Electron

**Cause:** Browser preview uses a demonstration API and cannot reproduce Electron global shortcuts, native clipboard ownership, tray behavior, autostart, or Linux input bridges.

**Solution:** Use preview only for visual work. Run Electron for desktop behavior and a real Linux session for OS integration.

## 11. Safe reset and clean reinstall

First uninstall system files:

```bash
./scripts/uninstall-system.sh
```

The uninstaller preserves user state. To reset state, first quit LClip, locate the exact `state.json`, make a backup if needed, and then remove only LClip's user-data directory. Never use a broad command such as `rm -rf ~/.config`.

Reinstall from the repository:

```bash
./scripts/install-system.sh
lclip --show
```

## 12. Information to include in a bug report

Do not include clipboard contents or the GIPHY key. Include:

- LClip version or Git commit;
- Linux distribution and version;
- desktop environment and version;
- output of `echo "$XDG_SESSION_TYPE"`;
- output of `echo "$XDG_CURRENT_DESKTOP"`;
- processor architecture from `uname -m`;
- which bridge commands exist;
- whether `lclip --show` opens the picker;
- whether selection copies, pastes, both, or neither;
- whether the target application is native Wayland or Xwayland, if known;
- exact terminal/test error with secrets removed;
- steps that reproduce the issue.

Run the automated checks before reporting a development regression:

```bash
npm ci
npm run verify
```

For project concepts and architecture, see [technical_details.md](technical_details.md). For installation and usage, return to [README.md](README.md).
