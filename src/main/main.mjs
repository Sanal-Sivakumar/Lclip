import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { addHistoryItem, StateStore } from "./store.mjs";
import { detectPasteBridge, pasteWithBridge } from "./paste-bridge.mjs";
import { selectWindowBackend } from "./window-backend.mjs";
import { downloadGiphyAsset, normalizeGiphyResults, readGiphySearchResponse, validateGiphyUrl } from "./giphy.mjs";
import { registerLclipIpc } from "./ipc-handlers.mjs";
import { buildShortcutStatus, detectGnomeNativeShortcut } from "./shortcut-status.mjs";
import { writeAutostartEntry } from "./autostart.mjs";

app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal,GlobalShortcutsPortalPreferredTrigger");
const windowBackend = selectWindowBackend({
  platform: process.platform,
  env: process.env
});
if (windowBackend.useXwayland) app.commandLine.appendSwitch("ozone-platform", "x11");
else app.commandLine.appendSwitch("ozone-platform-hint", "auto");
app.setName("LClip");
if (process.platform === "linux") app.setDesktopName("io.lclip.LClip.desktop");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let window;
let tray;
let store;
let monitor;
let bridge = { id: "unavailable", label: "Checking paste support", automatic: false };
let shortcutRegistered = false;
let lastClipboard = "";
let isQuitting = false;
let rendererReady = false;
let pendingShow = false;
let hasPositionedWindow = false;
let activationInProgress = false;
let quitAfterFlush = false;
let lastPersistenceNotification = "";
let gifDownloadController;
let gifSearchController;
let gnomeNativeShortcut = { supported: false, configured: false, label: "Not checked" };
let autostartStatus = { configured: false, label: "Not checked" };

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const rendererPath = (...parts) => join(app.getAppPath(), "src", "renderer", ...parts);
const buildRevision = (() => {
  for (const marker of ["LCLIP_BUILD", "LCLIP_PORTABLE_INSTALL"]) {
    try {
      const value = readFileSync(join(process.resourcesPath, marker), "utf8").trim().slice(0, 80);
      if (value) return value;
    } catch {}
  }
  return app.isPackaged ? `v${app.getVersion()}` : "development checkout";
})();

function publicState() {
  const snapshot = store.snapshot();
  const shortcutStatus = buildShortcutStatus({
    electronRegistered: shortcutRegistered,
    platform: process.platform,
    env: process.env,
    windowBackend,
    gnome: gnomeNativeShortcut
  });
  return {
    history: snapshot.history,
    settings: snapshot.settings,
    status: {
      shortcut: shortcutStatus.active,
      shortcutLabel: "Super + .",
      shortcutStatus,
      pasteBridge: bridge.label,
      automaticPaste: bridge.automatic,
      windowBackend: windowBackend.label,
      buildRevision,
      session: process.env.XDG_SESSION_TYPE || (process.platform === "linux" ? "unknown" : process.platform),
      desktop: process.env.XDG_CURRENT_DESKTOP || "",
      persistence: store.persistenceSnapshot(),
      autostart: autostartStatus
    }
  };
}

function broadcast() {
  if (window && !window.isDestroyed()) window.webContents.send("lclip:state", publicState());
}

function handlePersistenceStatus(status) {
  broadcast();
  if (status.state !== "error") {
    if (status.state === "saved") lastPersistenceNotification = "";
    return;
  }
  if (status.message === lastPersistenceNotification) return;
  lastPersistenceNotification = status.message;
  if (Notification.isSupported()) {
    new Notification({
      title: "LClip could not save local data",
      body: "Your current session is still available, but changes may be lost after restart. Open Settings for details."
    }).show();
  }
}

function createWindow() {
  window = new BrowserWindow({
    width: 700,
    height: 510,
    minWidth: 580,
    minHeight: 420,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    movable: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    roundedCorners: true,
    title: "LClip",
    webPreferences: {
      preload: join(app.getAppPath(), "src", "preload", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  window.setAlwaysOnTop(true, "pop-up-menu");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.loadFile(rendererPath("index.html"));
  window.once("ready-to-show", () => {
    rendererReady = true;
    if (pendingShow) showWindow();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    const allowed = url === "https://github.com/Sanal-Sivakumar/Lclip"
      || url === "mailto:sanalsiva2005@gmail.com"
      || /^https:\/\/(?:developers\.giphy\.com|giphy\.com)\//.test(url);
    if (allowed) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", event => event.preventDefault());
  window.on("close", event => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });
  window.on("blur", () => {
    if (window?.isVisible() && !activationInProgress && !window.webContents.isDevToolsOpened()) window.hide();
  });
}

function positionWindow() {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { x, y, width, height } = display.workArea;
  const bounds = window.getBounds();
  window.setPosition(
    Math.round(x + (width - bounds.width) / 2),
    Math.round(y + Math.max(24, (height - bounds.height) * 0.38))
  );
}

function revealWindow(resetToHistory) {
  if (!window || window.isDestroyed()) return;
  if (!rendererReady) {
    pendingShow = true;
    return;
  }
  pendingShow = false;
  if (!hasPositionedWindow) {
    positionWindow();
    hasPositionedWindow = true;
  }
  window.show();
  window.focus();
  if (resetToHistory) window.webContents.send("lclip:open");
}

function showWindow() {
  revealWindow(true);
}

function restoreWindowAfterPaste() {
  revealWindow(false);
}

function toggleWindow() {
  if (window?.isVisible()) window.hide();
  else showWindow();
}

function registerShortcut() {
  if (process.platform !== "linux") return false;
  try {
    return globalShortcut.register("Super+.", showWindow);
  } catch {
    return false;
  }
}

function startClipboardMonitor() {
  clearInterval(monitor);
  lastClipboard = clipboard.readText("clipboard");
  monitor = setInterval(() => {
    if (!store.state.settings.captureEnabled) return;
    const text = clipboard.readText("clipboard");
    if (!text.trim() || text === lastClipboard) return;
    lastClipboard = text;
    store.update(state => { state.history = addHistoryItem(state.history, text); });
    broadcast();
  }, 350);
  monitor.unref?.();
}

async function pasteIntoPreviousApp(waitMilliseconds) {
  const reopenPicker = Boolean(window?.isVisible());
  activationInProgress = true;
  window?.hide();
  try {
    await delay(waitMilliseconds);
    return await pasteWithBridge(bridge);
  } finally {
    await delay(80);
    activationInProgress = false;
    if (reopenPicker) restoreWindowAfterPaste();
  }
}

async function activateText(text) {
  const value = String(text || "").slice(0, 50_000);
  if (!value.trim()) return { ok: false, pasted: false };
  clipboard.writeText(value);
  lastClipboard = value;
  store.update(state => { state.history = addHistoryItem(state.history, value); });
  const pasted = await pasteIntoPreviousApp(150);
  if (!pasted && Notification.isSupported()) {
    new Notification({ title: "LClip copied the item", body: "Automatic paste is unavailable. Focus the target app, then press Ctrl+V." }).show();
  }
  broadcast();
  return { ok: true, pasted };
}

async function activateGif(gif) {
  gifDownloadController?.abort();
  const controller = new AbortController();
  gifDownloadController = controller;
  try {
    const { bytes, url } = await downloadGiphyAsset(gif?.original, { signal: controller.signal });
    const image = nativeImage.createFromBuffer(bytes);
    clipboard.write({
      text: url,
      html: `<img src="${url.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" alt="GIF">`,
      ...(image.isEmpty() ? {} : { image })
    });
    lastClipboard = url;
    const pasted = await pasteIntoPreviousApp(180);
    broadcast();
    return { ok: true, pasted };
  } finally {
    if (gifDownloadController === controller) gifDownloadController = undefined;
  }
}

async function searchGiphy(query) {
  const key = String(store.state.settings.giphyApiKey || "").trim();
  if (!key) return { state: "missing-key", results: [] };
  const term = String(query || "").trim().slice(0, 80);
  const endpoint = term ? "search" : "trending";
  const url = new URL(`https://api.giphy.com/v1/gifs/${endpoint}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("limit", "24");
  url.searchParams.set("rating", store.state.settings.gifRating || "pg");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bundle", "messaging_non_clips");
  if (term) url.searchParams.set("q", term);
  gifSearchController?.abort();
  const controller = new AbortController();
  gifSearchController = controller;
  const timeout = setTimeout(() => controller.abort(new Error("GIPHY search timed out")), 10_000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    validateGiphyUrl(response.url || url);
    const data = await readGiphySearchResponse(response);
    return {
      state: "ready",
      results: normalizeGiphyResults(data)
    };
  } finally {
    clearTimeout(timeout);
    if (gifSearchController === controller) gifSearchController = undefined;
  }
}

function cancelGiphySearch() {
  gifSearchController?.abort();
  gifSearchController = undefined;
}

async function setAutostart(enabled) {
  if (process.platform !== "linux") {
    autostartStatus = { configured: false, label: "Linux installation required" };
    return;
  }
  try {
    await writeAutostartEntry({
      home: app.getPath("home"),
      enabled,
      executable: process.env.APPIMAGE || process.execPath
    });
    autostartStatus = {
      configured: true,
      label: enabled ? "Starts after graphical login" : "Disabled for this user"
    };
  } catch (error) {
    autostartStatus = {
      configured: false,
      label: `Autostart update failed · ${String(error?.message || "storage error").slice(0, 140)}`
    };
    broadcast();
    throw error;
  }
}

function createTray() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><rect x="4" y="3" width="12" height="14" rx="3" fill="none" stroke="white" stroke-width="1.7"/><rect x="7" y="6" width="12" height="13" rx="3" fill="#b8d9e8" stroke="#111" stroke-width="1.3"/><path d="M10 10h6M10 13h5" stroke="#111" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
  tray = new Tray(icon);
  tray.setToolTip("LClip · Super + .");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open LClip", accelerator: "Super+.", click: showWindow },
    { label: store.state.settings.captureEnabled ? "Pause clipboard capture" : "Resume clipboard capture", click: async () => {
      await store.updateAndPersist(state => { state.settings.captureEnabled = !state.settings.captureEnabled; }).catch(() => {});
      createTrayMenu();
      broadcast();
    } },
    { type: "separator" },
    { label: "Quit LClip", click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.on("click", toggleWindow);
}

function createTrayMenu() {
  if (!tray) return createTray();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open LClip", accelerator: "Super+.", click: showWindow },
    { label: store.state.settings.captureEnabled ? "Pause clipboard capture" : "Resume clipboard capture", click: async () => {
      await store.updateAndPersist(state => { state.settings.captureEnabled = !state.settings.captureEnabled; }).catch(() => {});
      createTrayMenu();
      broadcast();
    } },
    { type: "separator" },
    { label: "Quit LClip", click: () => { isQuitting = true; app.quit(); } }
  ]));
}

function registerIpc() {
  registerLclipIpc({
    ipcMain,
    store,
    activateText,
    activateGif,
    setAutostart,
    searchGiphy,
    cancelGiphySearch,
    hideWindow: () => window?.hide(),
    createTrayMenu,
    broadcast,
    publicState
  });
}

app.on("second-instance", (_event, argv) => {
  if (argv.includes("--hidden")) return;
  showWindow();
});

app.whenReady().then(async () => {
  store = new StateStore(join(app.getPath("userData"), "state.json"), { onPersistenceStatus: handlePersistenceStatus });
  await store.load();
  if (store.persistenceSnapshot().state === "error") {
    autostartStatus = { configured: false, label: "Not changed because saved settings could not be loaded" };
  } else {
    await setAutostart(store.state.settings.autostartEnabled).catch(() => {});
  }
  bridge = await detectPasteBridge();
  gnomeNativeShortcut = await detectGnomeNativeShortcut();
  createWindow();
  registerIpc();
  createTray();
  shortcutRegistered = registerShortcut();
  startClipboardMonitor();
  broadcast();
  if (process.argv.includes("--show") || process.argv.includes("--dev")) showWindow();
  if (process.argv.includes("--dev")) window.webContents.openDevTools({ mode: "detach" });
});

app.on("activate", showWindow);
app.on("before-quit", event => {
  isQuitting = true;
  clearInterval(monitor);
  globalShortcut.unregisterAll();
  cancelGiphySearch();
  gifDownloadController?.abort();
  if (store?.hasPendingWrites && !quitAfterFlush) {
    event.preventDefault();
    quitAfterFlush = true;
    store.flush().catch(() => {}).finally(() => app.quit());
  }
});
