const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const demoState = {
  history: [
    { id: "demo-1", text: "LClip keeps only the last ten copied text items.", createdAt: Date.now() - 38_000 },
    { id: "demo-2", text: "Super + . opens this picker from anywhere", createdAt: Date.now() - 180_000 },
    { id: "demo-3", text: "https://github.com/", createdAt: Date.now() - 3_600_000 }
  ],
  settings: { captureEnabled: true, autostartEnabled: true, giphyApiKey: "", gifRating: "pg" },
  status: { shortcut: true, shortcutLabel: "Super + .", pasteBridge: "Preview mode · Linux bridge not active", automaticPaste: false, session: "preview", desktop: "" }
};

const demoApi = {
  bootstrap: async () => structuredClone(demoState),
  activate: async value => { await navigator.clipboard?.writeText(String(value)).catch(() => {}); return { ok: true, pasted: false }; },
  removeHistory: async id => { demoState.history = demoState.history.filter(item => item.id !== id); return demoState.history; },
  clearHistory: async () => { demoState.history = []; return true; },
  setCapture: async enabled => { demoState.settings.captureEnabled = enabled; return structuredClone(demoState); },
  saveSettings: async settings => { demoState.settings = { ...demoState.settings, ...settings }; return structuredClone(demoState); },
  searchGifs: async () => ({ state: "missing-key", results: [] }),
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
  gifTimer: null
};

const modes = {
  clipboard: { title: "Clipboard history", description: "Your 10 most recent copied text items, stored only on this device.", placeholder: "Search clipboard history" },
  emoji: { title: "Emoji", description: "Search and paste expressive characters without leaving your current app.", placeholder: "Search emoji" },
  kaomoji: { title: "Kaomoji", description: "Text expressions that work anywhere plain text does.", placeholder: "Search kaomoji" },
  gifs: { title: "GIFs", description: "Search GIPHY and paste a reaction into supported apps.", placeholder: "Search GIFs" },
  symbols: { title: "Special characters", description: "Useful arrows, currency, mathematics, punctuation, and technical symbols.", placeholder: "Search special characters" }
};

const emoji = [
  ["😀", "grinning face", "smileys"], ["😃", "happy face", "smileys"], ["😄", "smiling eyes", "smileys"], ["😁", "beaming face", "smileys"],
  ["😂", "tears of joy", "smileys"], ["🥹", "holding back tears", "smileys"], ["😊", "warm smile", "smileys"], ["😌", "relieved face", "smileys"],
  ["😍", "heart eyes", "smileys"], ["🥰", "smiling hearts", "smileys"], ["😘", "kiss", "smileys"], ["😎", "sunglasses", "smileys"],
  ["🤓", "nerd face", "smileys"], ["🫡", "salute", "smileys"], ["🤔", "thinking", "smileys"], ["🫠", "melting face", "smileys"],
  ["😴", "sleeping", "smileys"], ["😭", "crying", "smileys"], ["😤", "triumph", "smileys"], ["😡", "angry", "smileys"],
  ["👍", "thumbs up", "gestures"], ["👎", "thumbs down", "gestures"], ["👏", "clapping hands", "gestures"], ["🙌", "raising hands", "gestures"],
  ["🤝", "handshake", "gestures"], ["🙏", "folded hands", "gestures"], ["✌️", "victory hand", "gestures"], ["🤞", "crossed fingers", "gestures"],
  ["👌", "okay hand", "gestures"], ["🫶", "heart hands", "gestures"], ["💪", "strong arm", "gestures"], ["👀", "eyes", "gestures"],
  ["❤️", "red heart", "symbols"], ["🩷", "pink heart", "symbols"], ["🧡", "orange heart", "symbols"], ["💛", "yellow heart", "symbols"],
  ["💚", "green heart", "symbols"], ["💙", "blue heart", "symbols"], ["💜", "purple heart", "symbols"], ["✨", "sparkles", "symbols"],
  ["🔥", "fire", "symbols"], ["💯", "hundred points", "symbols"], ["✅", "check mark", "symbols"], ["❌", "cross mark", "symbols"],
  ["🎉", "party popper", "objects"], ["🎁", "gift", "objects"], ["🚀", "rocket", "objects"], ["💡", "light bulb", "objects"],
  ["💻", "laptop", "objects"], ["📌", "pushpin", "objects"], ["📝", "memo", "objects"], ["🔒", "lock", "objects"],
  ["🐶", "dog", "nature"], ["🐱", "cat", "nature"], ["🐼", "panda", "nature"], ["🦊", "fox", "nature"],
  ["🌱", "seedling", "nature"], ["🌻", "sunflower", "nature"], ["🌙", "moon", "nature"], ["⭐", "star", "nature"]
].map(([value, name, category]) => ({ value, name, category }));

const kaomoji = [
  ["(＾▽＾)", "happy"], ["(◕‿◕)", "smile"], ["(｡♥‿♥｡)", "love"], ["(づ｡◕‿‿◕｡)づ", "hug"],
  ["¯\\_(ツ)_/¯", "shrug"], ["(╯°□°）╯︵ ┻━┻", "table flip"], ["┬─┬ ノ( ゜-゜ノ)", "table restore"], ["ಠ_ಠ", "disapproval"],
  ["(¬‿¬)", "smirk"], ["(•̀ᴗ•́)و ̑̑", "you can do it"], ["ᕦ(ò_óˇ)ᕤ", "strong"], ["(ง'̀-'́)ง", "fight"],
  ["(っ˘ڡ˘ς)", "delicious"], ["(－‸ლ)", "facepalm"], ["(ಥ﹏ಥ)", "crying"], ["(；一_一)", "suspicious"],
  ["ʕ•ᴥ•ʔ", "bear"], ["ฅ^•ﻌ•^ฅ", "cat"], ["U・ᴥ・U", "dog"], ["くコ:彡", "squid"],
  ["♪~ ᕕ(ᐛ)ᕗ", "dancing"], ["(☞ﾟヮﾟ)☞", "finger guns"], ["☜(ﾟヮﾟ☜)", "finger guns left"], ["(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "magic"],
  ["(￣▽￣)ノ", "hello"], ["( ^_^)／", "wave"], ["(-_-)/~~~", "goodbye"], ["(￣o￣) zzZZzzZZ", "sleep"],
  ["(⊙_⊙)", "surprised"], ["(⊙﹏⊙)", "worried"], ["(⌐■_■)", "deal with it"], ["(｡•́︿•̀｡)", "sad"]
].map(([value, name]) => ({ value, name, category: "all" }));

const symbols = [
  ["→", "right arrow", "arrows"], ["←", "left arrow", "arrows"], ["↑", "up arrow", "arrows"], ["↓", "down arrow", "arrows"],
  ["↔", "left right arrow", "arrows"], ["↗", "up right arrow", "arrows"], ["↘", "down right arrow", "arrows"], ["⇒", "double right arrow", "arrows"],
  ["€", "euro", "currency"], ["£", "pound", "currency"], ["¥", "yen", "currency"], ["₹", "rupee", "currency"],
  ["₿", "bitcoin", "currency"], ["¢", "cent", "currency"], ["₽", "ruble", "currency"], ["₩", "won", "currency"],
  ["±", "plus minus", "math"], ["×", "multiply", "math"], ["÷", "divide", "math"], ["≈", "approximately", "math"],
  ["≠", "not equal", "math"], ["≤", "less or equal", "math"], ["≥", "greater or equal", "math"], ["∞", "infinity", "math"],
  ["√", "square root", "math"], ["∑", "sum", "math"], ["∫", "integral", "math"], ["π", "pi", "math"],
  ["©", "copyright", "legal"], ["®", "registered", "legal"], ["™", "trademark", "legal"], ["§", "section", "legal"],
  ["•", "bullet", "punctuation"], ["…", "ellipsis", "punctuation"], ["—", "em dash", "punctuation"], ["–", "en dash", "punctuation"],
  ["“", "left double quote", "punctuation"], ["”", "right double quote", "punctuation"], ["‘", "left single quote", "punctuation"], ["’", "right single quote", "punctuation"],
  ["°", "degree", "technical"], ["µ", "micro", "technical"], ["Ω", "omega ohm", "technical"], ["⌘", "command", "technical"],
  ["⌥", "option", "technical"], ["⌫", "delete", "technical"], ["⏎", "return", "technical"], ["⎋", "escape", "technical"]
].map(([value, name, category]) => ({ value, name, category }));

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
  renderStatus();
  selectIndex(Math.min(state.selectedIndex, Math.max(0, selectables().length - 1)), false);
}

function renderHeadingActions() {
  const container = $("#headingActions");
  container.replaceChildren();
  if (state.mode === "clipboard") {
    const pause = element("button", "quiet-action", state.data.settings.captureEnabled ? "Pause capture" : "Resume capture");
    pause.onclick = async () => { state.data = await api.setCapture(!state.data.settings.captureEnabled); render(); };
    const clear = element("button", "quiet-action", "Clear");
    clear.disabled = !state.data.history.length;
    clear.onclick = clearHistory;
    container.append(pause, clear);
    return;
  }
  const source = state.mode === "emoji" ? emoji : state.mode === "symbols" ? symbols : [];
  if (!source.length) return;
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
    const row = element("div", "history-row");
    row.tabIndex = -1;
    row.dataset.selectable = "true";
    row.setAttribute("role", "option");
    row.setAttribute("aria-label", `Paste clipboard item ${index + 1}: ${item.text.slice(0, 80)}`);
    row.onclick = event => { if (!event.target.closest(".remove-item")) activateValue(item.text); };
    const number = element("span", "history-index", String(index + 1));
    const copy = element("span", "history-copy");
    copy.append(element("strong", "", item.text.replace(/\s+/g, " ")), element("small", "", `${formatAge(item.createdAt)} · ${item.text.length} characters`));
    const remove = element("button", "remove-item", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove clipboard item ${index + 1}`);
    remove.onclick = async event => { event.stopPropagation(); state.data.history = await api.removeHistory(item.id); render(); };
    row.append(number, copy, remove);
    list.append(row);
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
  items.forEach(item => {
    const button = element("button", "glyph-item");
    button.type = "button";
    button.dataset.selectable = "true";
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
  state.gifs.forEach(gif => {
    const button = element("button", "gif-item");
    button.type = "button";
    button.dataset.selectable = "true";
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

function renderStatus() {
  const enabled = state.data.settings.captureEnabled;
  $("#captureStatus").classList.toggle("paused", !enabled);
  $("#captureStatus span").textContent = enabled ? `Capture on · ${state.data.history.length}/10 items` : "Clipboard capture is paused";
  $("#pasteStatus").textContent = state.data.status.pasteBridge;
}

function selectables() { return $$('[data-selectable="true"]'); }
function selectIndex(index, scroll = true) {
  const nodes = selectables();
  if (!nodes.length) return;
  state.selectedIndex = Math.max(0, Math.min(index, nodes.length - 1));
  nodes.forEach((node, itemIndex) => {
    const selected = itemIndex === state.selectedIndex;
    node.classList.toggle("selected", selected);
    node.setAttribute("aria-selected", String(selected));
  });
  if (scroll) nodes[state.selectedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function activateValue(value) {
  const result = await api.activate(value);
  if (!result?.pasted && api.platform === "browser") toast("Copied in preview mode");
}

async function activateGif(gif) {
  try {
    const result = await api.activateGif(gif);
    if (!result?.pasted && api.platform === "browser") toast("GIF selected in preview mode");
  } catch (error) {
    toast(error.message || "Could not paste that GIF");
  }
}

async function loadGifs() {
  state.gifState = "loading";
  renderGifs();
  try {
    const response = await api.searchGifs(state.query);
    state.gifState = response.state;
    state.gifs = response.results || [];
  } catch {
    state.gifState = "error";
    state.gifs = [];
  }
  if (state.mode === "gifs") render();
}

async function clearHistory() {
  await api.clearHistory();
  state.data.history = [];
  render();
  toast("Clipboard history cleared");
}

function openSettings() {
  $("#autostartSetting").checked = state.data.settings.autostartEnabled;
  $("#captureSetting").checked = state.data.settings.captureEnabled;
  $("#giphyKey").value = state.data.settings.giphyApiKey || "";
  $("#gifRating").value = state.data.settings.gifRating || "pg";
  const shortcut = state.data.status.shortcut ? "Shortcut registered" : "Shortcut unavailable";
  $("#integrationCard").textContent = `${shortcut} · ${state.data.status.pasteBridge}. Session: ${state.data.status.session}${state.data.status.desktop ? ` · ${state.data.status.desktop}` : ""}.`;
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
  state.data = await api.saveSettings({
    autostartEnabled: $("#autostartSetting").checked,
    giphyApiKey: $("#giphyKey").value,
    gifRating: $("#gifRating").value,
    closeAfterPaste: true
  });
  if ($("#captureSetting").checked !== state.data.settings.captureEnabled) state.data = await api.setCapture($("#captureSetting").checked);
  closeSettings();
  render();
  toast("Settings saved");
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
$("#captureSetting").onchange = event => { $("#captureStatus").classList.toggle("paused", !event.target.checked); };

document.addEventListener("keydown", event => {
  const settingsOpen = $("#settingsSheet").classList.contains("open");
  if (event.key === "Escape") {
    event.preventDefault();
    if (settingsOpen) closeSettings(); else api.hide();
    return;
  }
  if (settingsOpen) return;
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    selectIndex(state.selectedIndex + 1);
  } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    selectIndex(state.selectedIndex - 1);
  } else if (event.key === "Enter" && document.activeElement === $("#searchInput")) {
    const nodes = selectables();
    if (nodes[state.selectedIndex]) { event.preventDefault(); nodes[state.selectedIndex].click(); }
  }
});

api.onState(next => { state.data = next; render(); });
api.onOpen(() => {
  state.query = "";
  state.selectedIndex = 0;
  $("#searchInput").value = "";
  closeSettings();
  render();
  $("#searchInput").focus();
});

state.data = await api.bootstrap();
render();
$("#searchInput").focus();
