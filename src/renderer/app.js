import { emoji, kaomoji, symbols } from "./catalog.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const demoState = {
  history: [
    { id: "demo-1", text: "LClip keeps only the last ten copied text items.", createdAt: Date.now() - 38_000 },
    { id: "demo-2", text: "Super + . opens this picker from anywhere", createdAt: Date.now() - 180_000 },
    { id: "demo-3", text: "https://github.com/", createdAt: Date.now() - 3_600_000 }
  ],
  settings: { captureEnabled: true, autostartEnabled: true, giphyApiKey: "", gifRating: "pg" },
  status: {
    shortcut: true,
    shortcutLabel: "Super + .",
    shortcutStatus: {
      active: true,
      electron: { registered: true, route: "Browser preview", label: "Preview shortcut simulation active" },
      portal: { requested: false, active: false, label: "Not available in browser preview" },
      gnome: { supported: false, configured: false, label: "Not a GNOME session" }
    },
    pasteBridge: "Preview mode · Linux bridge not active",
    automaticPaste: false,
    windowBackend: "Browser preview",
    buildRevision: "development checkout",
    session: "preview",
    desktop: "",
    persistence: { state: "saved", message: "Changes are saved locally", lastSavedAt: Date.now(), pending: 0 }
  }
};

const demoApi = {
  bootstrap: async () => structuredClone(demoState),
  activate: async value => { await navigator.clipboard?.writeText(String(value)).catch(() => {}); return { ok: true, pasted: false }; },
  removeHistory: async id => { demoState.history = demoState.history.filter(item => item.id !== id); return demoState.history; },
  clearHistory: async () => { demoState.history = []; return true; },
  setCapture: async enabled => { demoState.settings.captureEnabled = enabled; return structuredClone(demoState); },
  saveSettings: async settings => { demoState.settings = { ...demoState.settings, ...settings }; return structuredClone(demoState); },
  searchGifs: async () => ({ state: "missing-key", results: [] }),
  cancelGifSearch: () => {},
  activateGif: async () => ({ ok: true, pasted: false }),
  hide: () => {},
  onState: () => () => {},
  onOpen: () => () => {},
  platform: "browser"
};

const api = window.lclip || demoApi;
const state = {
  mode: "clipboard",
  query: "",
  category: "all",
  selectedIndex: 0,
  data: structuredClone(demoState),
  gifState: "idle",
  gifs: [],
  gifTimer: null,
  gifRequestId: 0
};

const modes = {
  clipboard: { title: "Clipboard history", description: "Your 10 most recent copied text items, stored only on this device.", placeholder: "Search clipboard history" },
  emoji: { title: "Emoji", description: "Search and paste expressive characters without leaving your current app.", placeholder: "Search emoji" },
  kaomoji: { title: "Kaomoji", description: "Text expressions that work anywhere plain text does.", placeholder: "Search kaomoji" },
  gifs: { title: "GIFs", description: "Search GIPHY and paste a reaction into supported apps.", placeholder: "Search GIFs" },
  symbols: { title: "Special characters", description: "Useful arrows, currency, mathematics, punctuation, and technical symbols.", placeholder: "Search special characters" }
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatAge(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function setMode(mode) {
  if (!modes[mode]) return;
  if (state.mode === "gifs" && mode !== "gifs") {
    clearTimeout(state.gifTimer);
    state.gifRequestId += 1;
    api.cancelGifSearch();
  }
  state.mode = mode;
  state.query = "";
  state.category = "all";
  state.selectedIndex = 0;
  $("#searchInput").value = "";
  $$(".mode-button").forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  render();
  if (mode === "gifs") loadGifs();
  $("#searchInput").focus();
}

function render() {
  const meta = modes[state.mode];
  $("#sectionTitle").textContent = meta.title;
  $("#sectionDescription").textContent = meta.description;
  $("#searchInput").placeholder = meta.placeholder;
  $("#results").setAttribute("aria-label", `${meta.title} results`);
  renderHeadingActions();
  if (state.mode === "clipboard") renderHistory();
  else if (state.mode === "emoji") renderGlyphs(emoji, false);
  else if (state.mode === "kaomoji") renderGlyphs(kaomoji, true);
  else if (state.mode === "symbols") renderGlyphs(symbols, false);
  else renderGifs();
  selectIndex(Math.min(state.selectedIndex, Math.max(0, selectables().length - 1)), false);
}

function renderHeadingActions() {
  const container = $("#headingActions");
  container.classList.remove("category-actions");
  container.replaceChildren();
  if (state.mode === "clipboard") {
    const pause = element("button", "quiet-action", state.data.settings.captureEnabled ? "Pause capture" : "Resume capture");
    pause.onclick = async () => {
      try {
        state.data = await api.setCapture(!state.data.settings.captureEnabled);
        render();
      } catch {
        toast("Capture preference changed for this session, but could not be saved");
      }
    };
    const clear = element("button", "quiet-action", "Clear");
    clear.disabled = !state.data.history.length;
    clear.onclick = clearHistory;
    container.append(pause, clear);
    return;
  }
  const source = state.mode === "emoji" ? emoji : state.mode === "kaomoji" ? kaomoji : state.mode === "symbols" ? symbols : [];
  if (!source.length) return;
  container.classList.add("category-actions");
  const categories = ["all", ...new Set(source.map(item => item.category))];
  categories.forEach(category => {
    const button = element("button", `category-chip${state.category === category ? " active" : ""}`, category[0].toUpperCase() + category.slice(1));
    button.onclick = () => { state.category = category; state.selectedIndex = 0; render(); };
    container.append(button);
  });
}

function renderHistory() {
  const results = $("#results");
  results.replaceChildren();
  const query = state.query.toLowerCase();
  const items = state.data.history.filter(item => item.text.toLowerCase().includes(query));
  if (!items.length) return renderEmpty(results, query ? "No matching clipboard text" : "Clipboard history is ready", query ? "Try a different search." : "Copy text in any application. LClip will keep the latest ten items here.", "▣");
  const list = element("div", "history-list");
  items.forEach((item, index) => {
    const wrapper = element("div", "history-item");
    const row = element("button", "history-row");
    row.type = "button";
    row.tabIndex = -1;
    row.id = `lclip-option-${state.mode}-${index}`;
    row.dataset.selectable = "true";
    row.setAttribute("role", "option");
    row.setAttribute("aria-label", `Paste clipboard item ${index + 1}: ${item.text.slice(0, 80)}`);
    row.onclick = () => activateValue(item.text);
    const number = element("span", "history-index", String(index + 1));
    const copy = element("span", "history-copy");
    copy.append(element("strong", "", item.text.replace(/\s+/g, " ")), element("small", "", `${formatAge(item.createdAt)} · ${item.text.length} characters`));
    const remove = element("button", "remove-item", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove clipboard item ${index + 1}`);
    remove.onclick = async () => {
      try {
        state.data.history = await api.removeHistory(item.id);
        render();
      } catch {
        toast("Item removed for this session, but the change could not be saved");
      }
    };
    row.append(number, copy);
    wrapper.append(row, remove);
    list.append(wrapper);
  });
  results.append(list);
}

function renderGlyphs(source, isKaomoji) {
  const results = $("#results");
  results.replaceChildren();
  const query = state.query.toLowerCase();
  const items = source.filter(item => (state.category === "all" || item.category === state.category) && `${item.name} ${item.value}`.toLowerCase().includes(query));
  if (!items.length) return renderEmpty(results, "No characters found", "Try another word or choose a different category.", "⌕");
  const grid = element("div", `glyph-grid${isKaomoji ? " kaomoji-grid" : ""}`);
  items.forEach((item, index) => {
    const button = element("button", "glyph-item");
    button.type = "button";
    button.dataset.selectable = "true";
    button.id = `lclip-option-${state.mode}-${index}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", `Paste ${item.name}: ${item.value}`);
    button.onclick = () => activateValue(item.value);
    button.append(element("strong", "", item.value), element("small", "", item.name));
    grid.append(button);
  });
  results.append(grid);
}

function renderGifs() {
  const results = $("#results");
  results.replaceChildren();
  if (state.gifState === "loading") {
    const skeletons = element("div", "skeleton-grid");
    for (let i = 0; i < 12; i++) skeletons.append(element("div", "skeleton"));
    return results.append(skeletons);
  }
  if (state.gifState === "missing-key") {
    return renderEmpty(results, "Connect GIPHY to search GIFs", "Add a GIPHY API key in Settings. All other LClip features remain fully offline.", "GIF", "Open settings", openSettings);
  }
  if (state.gifState === "error") return renderEmpty(results, "GIF search is unavailable", "Check your connection and GIPHY API key, then try again.", "!", "Try again", loadGifs);
  if (!state.gifs.length) return renderEmpty(results, "Search for a reaction", "Enter a word above, or leave search empty to see trending GIFs.", "GIF");
  const grid = element("div", "gif-grid");
  state.gifs.forEach((gif, index) => {
    const button = element("button", "gif-item");
    button.type = "button";
    button.dataset.selectable = "true";
    button.id = `lclip-option-${state.mode}-${index}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", `Paste GIF: ${gif.title}`);
    button.onclick = () => activateGif(gif);
    const image = element("img");
    image.src = gif.preview;
    image.alt = gif.title;
    image.loading = "lazy";
    button.append(image);
    grid.append(button);
  });
  const attribution = element("p", "gif-attribution");
  attribution.append("Powered by ", element("strong", "", "GIPHY"));
  results.append(grid, attribution);
}

function renderEmpty(container, title, description, icon, actionLabel, action) {
  const empty = element("div", "empty-state");
  empty.append(element("span", "empty-icon", icon), element("h2", "", title), element("p", "", description));
  if (actionLabel && action) {
    const button = element("button", "quiet-action", actionLabel);
    button.onclick = action;
    empty.append(button);
  }
  container.append(empty);
}

function selectables() { return $$('[data-selectable="true"]'); }
function selectIndex(index, scroll = true) {
  const nodes = selectables();
  if (!nodes.length) {
    $("#searchInput").removeAttribute("aria-activedescendant");
    return;
  }
  state.selectedIndex = Math.max(0, Math.min(index, nodes.length - 1));
  nodes.forEach((node, itemIndex) => {
    const selected = itemIndex === state.selectedIndex;
    node.classList.toggle("selected", selected);
    node.setAttribute("aria-selected", String(selected));
  });
  $("#searchInput").setAttribute("aria-activedescendant", nodes[state.selectedIndex].id);
  if (scroll) nodes[state.selectedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function activateValue(value) {
  try {
    const result = await api.activate(value);
    if (!result?.pasted) toast(api.platform === "browser" ? "Copied in preview mode" : "Copied · focus the target, then press Ctrl+V");
  } catch {
    toast("Could not copy that item");
  }
}

async function activateGif(gif) {
  try {
    const result = await api.activateGif(gif);
    if (!result?.pasted) toast(api.platform === "browser" ? "GIF selected in preview mode" : "GIF copied · focus the target, then press Ctrl+V");
  } catch (error) {
    toast(error.message || "Could not paste that GIF");
  }
}

async function loadGifs() {
  const requestId = ++state.gifRequestId;
  state.gifState = "loading";
  renderGifs();
  try {
    const response = await api.searchGifs(state.query);
    if (requestId !== state.gifRequestId) return;
    state.gifState = response.state;
    state.gifs = response.results || [];
  } catch {
    if (requestId !== state.gifRequestId) return;
    state.gifState = "error";
    state.gifs = [];
  }
  if (state.mode === "gifs") render();
}

async function clearHistory() {
  try {
    await api.clearHistory();
    state.data.history = [];
    render();
    toast("Clipboard history cleared");
  } catch {
    state.data.history = [];
    render();
    toast("History cleared for this session, but the change could not be saved");
  }
}

function openSettings() {
  $("#autostartSetting").checked = state.data.settings.autostartEnabled;
  $("#captureSetting").checked = state.data.settings.captureEnabled;
  $("#giphyKey").value = state.data.settings.giphyApiKey || "";
  $("#gifRating").value = state.data.settings.gifRating || "pg";
  renderIntegrationStatus();
  const sheet = $("#settingsSheet");
  sheet.hidden = false;
  sheet.setAttribute("aria-hidden", "false");
  sheet.removeAttribute("inert");
  requestAnimationFrame(() => sheet.classList.add("open"));
  $(".picker").setAttribute("inert", "");
  $(".mode-rail").setAttribute("inert", "");
  $("#sheetScrim").classList.add("show");
  $("#settingsClose").focus();
}

function renderIntegrationStatus() {
  const container = $("#integrationCard");
  const status = state.data.status;
  const shortcut = status.shortcutStatus || {};
  const rows = [
    ["Electron shortcut", shortcut.electron?.label || (status.shortcut ? "Registered" : "Unavailable"), shortcut.electron?.registered ? "ready" : "limited"],
    ["Wayland portal", shortcut.portal?.label || "Status unavailable", shortcut.portal?.active ? "ready" : "neutral"],
    ["GNOME native", shortcut.gnome?.label || "Status unavailable", shortcut.gnome?.configured ? "ready" : "neutral"],
    ["Paste bridge", status.pasteBridge, status.automaticPaste ? "ready" : "limited"],
    ["Local storage", status.persistence?.state === "error" ? `Save failed · ${status.persistence.message}` : "Changes are saved locally", status.persistence?.state === "error" ? "error" : "ready"]
  ];
  container.replaceChildren();
  rows.forEach(([label, value, condition]) => {
    const row = element("div", "integration-status");
    row.dataset.state = condition;
    row.append(element("strong", "", label), element("span", "", value));
    container.append(row);
  });
  const detail = element("p", "integration-detail", `Window: ${status.windowBackend || "Native desktop"} · Build: ${status.buildRevision || "unknown"} · Session: ${status.session}${status.desktop ? ` · ${status.desktop}` : ""}`);
  container.append(detail);
}

function closeSettings() {
  const sheet = $("#settingsSheet");
  sheet.classList.remove("open");
  sheet.setAttribute("aria-hidden", "true");
  sheet.setAttribute("inert", "");
  setTimeout(() => { if (!sheet.classList.contains("open")) sheet.hidden = true; }, 220);
  $(".picker").removeAttribute("inert");
  $(".mode-rail").removeAttribute("inert");
  $("#sheetScrim").classList.remove("show");
  $("#searchInput").focus();
}

async function saveSettings() {
  const button = $("#saveSettingsButton");
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    state.data = await api.saveSettings({
      autostartEnabled: $("#autostartSetting").checked,
      giphyApiKey: $("#giphyKey").value,
      gifRating: $("#gifRating").value,
    });
    if ($("#captureSetting").checked !== state.data.settings.captureEnabled) state.data = await api.setCapture($("#captureSetting").checked);
    closeSettings();
    render();
    toast("Settings saved");
  } catch {
    toast("Settings could not be saved. Check storage permissions and available disk space.");
  } finally {
    button.disabled = false;
    button.textContent = "Save settings";
  }
}

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2600);
}

$("#searchInput").addEventListener("input", event => {
  state.query = event.target.value;
  state.selectedIndex = 0;
  if (state.mode === "gifs") {
    clearTimeout(state.gifTimer);
    state.gifTimer = setTimeout(loadGifs, 320);
  } else render();
});

$$(".mode-button").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
$("#closeButton").onclick = () => api.hide();
$("#settingsButton").onclick = openSettings;
$("#settingsClose").onclick = closeSettings;
$("#sheetScrim").onclick = closeSettings;
$("#saveSettingsButton").onclick = saveSettings;
$("#clearHistoryButton").onclick = clearHistory;

document.addEventListener("keydown", event => {
  const settingsOpen = $("#settingsSheet").classList.contains("open");
  if (event.key === "Escape") {
    event.preventDefault();
    if (settingsOpen) closeSettings(); else api.hide();
    return;
  }
  if (settingsOpen) return;
  const searchActive = document.activeElement === $("#searchInput");
  if (searchActive && (event.key === "ArrowDown" || event.key === "ArrowRight")) {
    event.preventDefault();
    selectIndex(state.selectedIndex + 1);
  } else if (searchActive && (event.key === "ArrowUp" || event.key === "ArrowLeft")) {
    event.preventDefault();
    selectIndex(state.selectedIndex - 1);
  } else if (searchActive && event.key === "Home") {
    event.preventDefault();
    selectIndex(0);
  } else if (searchActive && event.key === "End") {
    event.preventDefault();
    selectIndex(selectables().length - 1);
  } else if (event.key === "Enter" && searchActive) {
    const nodes = selectables();
    if (nodes[state.selectedIndex]) { event.preventDefault(); nodes[state.selectedIndex].click(); }
  }
});

api.onState(next => {
  const previousError = state.data?.status?.persistence?.state === "error" ? state.data.status.persistence.message : "";
  state.data = next;
  render();
  if ($("#settingsSheet").classList.contains("open")) renderIntegrationStatus();
  const persistence = next?.status?.persistence;
  if (persistence?.state === "error" && persistence.message !== previousError) {
    toast("Local save failed. Your current session is still available; changes may be lost after restart.");
  }
});
api.onOpen(() => {
  closeSettings();
  setMode("clipboard");
  $("#results").scrollTop = 0;
});

state.data = await api.bootstrap();
render();
$("#searchInput").focus();
