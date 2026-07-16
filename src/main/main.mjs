import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, shell, Tray } from "electron";
import { readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { addHistoryItem, StateStore } from "./store.mjs";
import { detectPasteBridge, pasteWithBridge } from "./paste-bridge.mjs";
import { selectWindowBackend } from "./window-backend.mjs";

app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal,GlobalShortcutsPortalPreferredTrigger");
const windowBackend = selectWindowBackend({
  platform: process.platform,
  env: process.env,
  ozonePlatformAlreadySet: app.commandLine.hasSwitch("ozone-platform")
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
let dragTimer;
let dragSafetyTimer;

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const rendererPath = (...parts) => join(app.getAppPath(), "src", "renderer", ...parts);
const buildRevision = (() => {
  try {
    return readFileSync(join(process.resourcesPath, "LCLIP_BUILD"), "utf8").trim().slice(0, 80) || `v${app.getVersion()}`;
  } catch {
    return app.isPackaged ? `v${app.getVersion()}` : "development checkout";
  }
})();

function publicState() {
  const snapshot = store.snapshot();
  return {
    history: snapshot.history,
    settings: snapshot.settings,
    status: {
      shortcut: shortcutRegistered,
      shortcutLabel: "Super + .",
      pasteBridge: bridge.label,
      automaticPaste: bridge.automatic,
      windowBackend: windowBackend.label,
      buildRevision,
      session: process.env.XDG_SESSION_TYPE || (process.platform === "linux" ? "unknown" : process.platform),
      desktop: process.env.XDG_CURRENT_DESKTOP || ""
    }
  };
}

function broadcast() {
  if (window && !window.isDestroyed()) window.webContents.send("lclip:state", publicState());
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
    if (/^https:\/\/(?:developers\.giphy\.com|giphy\.com)\//.test(url)) shell.openExternal(url);
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
    stopWindowDrag();
    if (window?.isVisible() && !activationInProgress && !window.webContents.isDevToolsOpened()) window.hide();
  });
}

function stopWindowDrag() {
  clearInterval(dragTimer);
  clearTimeout(dragSafetyTimer);
  dragTimer = undefined;
  dragSafetyTimer = undefined;
}

function startWindowDrag() {
  if (!window || window.isDestroyed()) return;
  stopWindowDrag();
  const cursorOrigin = screen.getCursorScreenPoint();
  const [windowX, windowY] = window.getPosition();
  dragTimer = setInterval(() => {
    if (!window || window.isDestroyed()) return stopWindowDrag();
    const cursor = screen.getCursorScreenPoint();
    window.setPosition(windowX + cursor.x - cursorOrigin.x, windowY + cursor.y - cursorOrigin.y);
  }, 16);
  dragTimer.unref?.();
  dragSafetyTimer = setTimeout(stopWindowDrag, 10_000);
  dragSafetyTimer.unref?.();
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

function showWindow() {
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
  window.webContents.send("lclip:open");
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
    if (reopenPicker) showWindow();
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
    new Notification({ title: "LClip copied the item", body: "Automatic paste is unavailable. Press Ctrl+V to paste it." }).show();
  }
  broadcast();
  return { ok: true, pasted };
}

async function activateGif(gif) {
  const requested = String(gif?.original || "");
  let url;
  try {
    const parsed = new URL(requested);
    if (parsed.protocol !== "https:" || !(parsed.hostname === "giphy.com" || parsed.hostname.endsWith(".giphy.com"))) throw new Error();
    url = parsed.toString();
  } catch {
    throw new Error("Unsupported GIF source");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("GIF download failed");
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > 15_000_000) throw new Error("GIF is too large");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 15_000_000) throw new Error("GIF is too large");
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
    clearTimeout(timeout);
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
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.meta?.msg || "GIPHY search failed");
  return {
    state: "ready",
    results: (data.data || []).map(item => ({
      id: String(item.id),
      title: String(item.title || "GIF").slice(0, 120),
      preview: item.images?.fixed_width_small?.webp || item.images?.fixed_width?.webp || "",
      original: item.images?.original?.url || "",
      width: Number(item.images?.fixed_width_small?.width || 200),
      height: Number(item.images?.fixed_width_small?.height || 120)
    })).filter(item => item.preview && item.original)
  };
}

async function setAutostart(enabled) {
  if (process.platform !== "linux") return;
  const directory = join(app.getPath("home"), ".config", "autostart");
  const override = join(directory, "io.lclip.LClip.desktop");
  if (enabled) {
    await rm(override, { force: true });
  } else {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(override, "[Desktop Entry]\nType=Application\nName=LClip\nHidden=true\n", { mode: 0o600 });
  }
}

function createTray() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><rect x="4" y="3" width="12" height="14" rx="3" fill="none" stroke="white" stroke-width="1.7"/><rect x="7" y="6" width="12" height="13" rx="3" fill="#b8d9e8" stroke="#111" stroke-width="1.3"/><path d="M10 10h6M10 13h5" stroke="#111" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
  tray = new Tray(icon);
  tray.setToolTip("LClip · Super + .");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open LClip", accelerator: "Super+.", click: showWindow },
    { label: store.state.settings.captureEnabled ? "Pause clipboard capture" : "Resume clipboard capture", click: () => {
      store.update(state => { state.settings.captureEnabled = !state.settings.captureEnabled; });
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
    { label: store.state.settings.captureEnabled ? "Pause clipboard capture" : "Resume clipboard capture", click: () => {
      store.update(state => { state.settings.captureEnabled = !state.settings.captureEnabled; });
      createTrayMenu();
      broadcast();
    } },
    { type: "separator" },
    { label: "Quit LClip", click: () => { isQuitting = true; app.quit(); } }
  ]));
}

function registerIpc() {
  ipcMain.handle("lclip:bootstrap", () => publicState());
  ipcMain.handle("lclip:activate", (_event, value) => activateText(value));
  ipcMain.handle("lclip:activate-gif", (_event, gif) => activateGif(gif));
  ipcMain.handle("lclip:remove-history", (_event, id) => {
    const state = store.update(draft => { draft.history = draft.history.filter(item => item.id !== id); });
    broadcast();
    return state.history;
  });
  ipcMain.handle("lclip:clear-history", () => {
    store.update(state => { state.history = []; });
    broadcast();
    return true;
  });
  ipcMain.handle("lclip:set-capture", (_event, enabled) => {
    store.update(state => { state.settings.captureEnabled = Boolean(enabled); });
    createTrayMenu();
    broadcast();
    return publicState();
  });
  ipcMain.handle("lclip:save-settings", async (_event, settings) => {
    const allowed = {
      autostartEnabled: Boolean(settings?.autostartEnabled),
      giphyApiKey: String(settings?.giphyApiKey || "").trim().slice(0, 180),
      gifRating: ["g", "pg", "pg-13"].includes(settings?.gifRating) ? settings.gifRating : "pg"
    };
    store.update(state => { state.settings = { ...state.settings, ...allowed }; });
    await setAutostart(allowed.autostartEnabled);
    broadcast();
    return publicState();
  });
  ipcMain.handle("lclip:search-gifs", (_event, query) => searchGiphy(query));
  ipcMain.on("lclip:drag-start", startWindowDrag);
  ipcMain.on("lclip:drag-stop", stopWindowDrag);
  ipcMain.on("lclip:hide", () => window?.hide());
}

app.on("second-instance", (_event, argv) => {
  if (argv.includes("--hidden")) return;
  showWindow();
});

app.whenReady().then(async () => {
  store = new StateStore(join(app.getPath("userData"), "state.json"));
  await store.load();
  bridge = await detectPasteBridge();
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
app.on("before-quit", () => {
  isQuitting = true;
  stopWindowDrag();
  clearInterval(monitor);
  globalShortcut.unregisterAll();
});
