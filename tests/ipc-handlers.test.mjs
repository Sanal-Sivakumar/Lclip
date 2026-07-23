import test from "node:test";
import assert from "node:assert/strict";
import { registerLclipIpc, sanitizeSettings } from "../src/main/ipc-handlers.mjs";

function harness() {
  const handles = new Map();
  const events = new Map();
  const state = {
    history: [{ id: "one", text: "alpha" }, { id: "two", text: "beta" }],
    settings: { captureEnabled: true, autostartEnabled: true, giphyApiKey: "", gifRating: "pg" }
  };
  let broadcasts = 0;
  let trayRefreshes = 0;
  const autostart = [];
  const store = {
    snapshot() {
      return structuredClone(state);
    },
    async updateAndPersist(mutator) {
      mutator(state);
      return structuredClone(state);
    },
    restore(snapshot) {
      state.history = structuredClone(snapshot.history);
      state.settings = structuredClone(snapshot.settings);
    }
  };
  registerLclipIpc({
    ipcMain: { handle: (channel, callback) => handles.set(channel, callback), on: (channel, callback) => events.set(channel, callback) },
    store,
    activateText: async value => ({ ok: true, value }),
    activateGif: async gif => ({ ok: true, gif }),
    setAutostart: async enabled => { autostart.push(enabled); },
    searchGiphy: async query => ({ state: "ready", query }),
    cancelGiphySearch: () => {}, hideWindow: () => {},
    createTrayMenu: () => { trayRefreshes += 1; },
    broadcast: () => { broadcasts += 1; },
    publicState: () => structuredClone(state)
  });
  return { autostart, broadcasts: () => broadcasts, events, handles, state, trayRefreshes: () => trayRefreshes };
}

test("settings IPC accepts only the documented settings contract", () => {
  const sanitized = sanitizeSettings({ captureEnabled: 1, autostartEnabled: 1, giphyApiKey: `  ${"x".repeat(220)}  `, gifRating: "r", unexpected: "ignored" });
  assert.deepEqual(Object.keys(sanitized), ["captureEnabled", "autostartEnabled", "giphyApiKey", "gifRating"]);
  assert.equal(sanitized.captureEnabled, true);
  assert.equal(sanitized.autostartEnabled, true);
  assert.equal(sanitized.giphyApiKey.length, 180);
  assert.equal(sanitized.gifRating, "pg");
});

test("history and capture IPC wait for persistence before broadcasting", async () => {
  const app = harness();
  const history = await app.handles.get("lclip:remove-history")({}, "one");
  assert.deepEqual(history.map(item => item.id), ["two"]);
  assert.equal(app.broadcasts(), 1);
  const next = await app.handles.get("lclip:set-capture")({}, 0);
  assert.equal(next.settings.captureEnabled, false);
  assert.equal(app.trayRefreshes(), 1);
  assert.equal(app.broadcasts(), 2);
});

test("settings IPC applies autostart and returns persisted state", async () => {
  const app = harness();
  const next = await app.handles.get("lclip:save-settings")({}, { captureEnabled: true, autostartEnabled: false, giphyApiKey: " key ", gifRating: "pg-13" });
  assert.deepEqual(app.autostart, [false]);
  assert.equal(next.settings.giphyApiKey, "key");
  assert.equal(next.settings.gifRating, "pg-13");
  assert.equal(app.trayRefreshes(), 1);
  assert.equal(app.broadcasts(), 1);
  assert.ok(app.events.has("lclip:cancel-gif-search"));
  assert.ok(app.events.has("lclip:hide"));
});

test("settings IPC restores autostart when persistence fails", async () => {
  const app = harness();
  const originalUpdate = app.state.settings.autostartEnabled;
  const failingStore = {
    snapshot: () => structuredClone(app.state),
    restore: snapshot => {
      app.state.history = structuredClone(snapshot.history);
      app.state.settings = structuredClone(snapshot.settings);
    },
    updateAndPersist: async mutator => {
      mutator(app.state);
      throw new Error("disk full");
    }
  };
  const handles = new Map();
  const autostart = [];
  registerLclipIpc({
    ipcMain: { handle: (channel, callback) => handles.set(channel, callback), on: () => {} },
    store: failingStore,
    activateText: async () => {}, activateGif: async () => {},
    setAutostart: async enabled => { autostart.push(enabled); }, searchGiphy: async () => {},
    cancelGiphySearch: () => {}, hideWindow: () => {}, createTrayMenu: () => {}, broadcast: () => {}, publicState: () => ({})
  });
  await assert.rejects(handles.get("lclip:save-settings")({}, {
    captureEnabled: true,
    autostartEnabled: false,
    giphyApiKey: "",
    gifRating: "pg"
  }), /disk full/);
  assert.deepEqual(autostart, [false, originalUpdate]);
  assert.equal(app.state.settings.autostartEnabled, originalUpdate);
});

test("persistence failures propagate through IPC", async () => {
  const app = harness();
  app.handles.clear();
  registerLclipIpc({
    ipcMain: { handle: (channel, callback) => app.handles.set(channel, callback), on: () => {} },
    store: { updateAndPersist: async () => { throw new Error("disk full"); } },
    activateText: async () => {}, activateGif: async () => {}, setAutostart: async () => {}, searchGiphy: async () => {},
    cancelGiphySearch: () => {}, hideWindow: () => {}, createTrayMenu: () => {}, broadcast: () => {}, publicState: () => ({})
  });
  await assert.rejects(app.handles.get("lclip:clear-history")(), /disk full/);
});
