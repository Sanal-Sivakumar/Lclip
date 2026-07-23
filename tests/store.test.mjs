import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { addHistoryItem, MAX_HISTORY, normalizeHistory, StateStore } from "../src/main/store.mjs";

test("clipboard history is bounded to ten items", () => {
  let history = [];
  for (let index = 0; index < 14; index++) history = addHistoryItem(history, `item ${index}`, index);
  assert.equal(history.length, MAX_HISTORY);
  assert.equal(history[0].text, "item 13");
  assert.equal(history.at(-1).text, "item 4");
});

test("copying the same text moves it to the front without duplication", () => {
  let history = addHistoryItem([], "alpha", 1, "Firefox");
  history = addHistoryItem(history, "beta", 2, "Code");
  history = addHistoryItem(history, "alpha", 3, "Firefox");
  assert.deepEqual(history.map(item => item.text), ["alpha", "beta"]);
  assert.equal(history[0].createdAt, 3);
  assert.equal(history[0].source, "Firefox");
});

test("invalid and blank persisted values are discarded", () => {
  const history = normalizeHistory([null, { text: "   " }, { text: "safe", createdAt: 10 }, { text: "safe", createdAt: 20 }]);
  assert.equal(history.length, 1);
  assert.equal(history[0].text, "safe");
});

test("state updates can be awaited through a private atomic write", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-store-"));
  const path = join(directory, "state.json");
  const statuses = [];
  const store = new StateStore(path, { onPersistenceStatus: status => statuses.push(status) });
  await store.updateAndPersist(state => { state.history = addHistoryItem(state.history, "persisted"); });
  const saved = JSON.parse(await readFile(path, "utf8"));
  assert.equal(saved.history[0].text, "persisted");
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.equal(store.persistenceSnapshot().state, "saved");
  assert.equal(statuses.at(-1).state, "saved");
});

test("persistence errors are observable and a later write clears them", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-store-error-"));
  const blocker = join(directory, "not-a-directory");
  await writeFile(blocker, "blocked");
  await chmod(blocker, 0o600);
  const statuses = [];
  const store = new StateStore(join(blocker, "state.json"), { onPersistenceStatus: status => statuses.push(status) });
  await assert.rejects(store.updateAndPersist(state => { state.history = addHistoryItem(state.history, "session only"); }));
  assert.equal(store.persistenceSnapshot().state, "error");
  assert.equal(statuses.at(-1).state, "error");
  store.path = join(directory, "recovered.json");
  await store.updateAndPersist(state => { state.settings.captureEnabled = false; });
  await store.flush();
  assert.equal(store.persistenceSnapshot().state, "saved");
});

test("malformed saved state is reported instead of silently ignored", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lclip-store-load-error-"));
  const path = join(directory, "state.json");
  await writeFile(path, "{not valid json", { mode: 0o600 });
  const statuses = [];
  const store = new StateStore(path, { onPersistenceStatus: status => statuses.push(status) });
  const state = await store.load();
  assert.deepEqual(state.history, []);
  assert.equal(store.persistenceSnapshot().state, "error");
  assert.match(store.persistenceSnapshot().message, /Could not load local data/);
  assert.equal(statuses.at(-1).state, "error");
});
