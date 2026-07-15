import test from "node:test";
import assert from "node:assert/strict";
import { addHistoryItem, MAX_HISTORY, normalizeHistory } from "../src/main/store.mjs";

test("clipboard history is bounded to ten items", () => {
  let history = [];
  for (let index = 0; index < 14; index++) history = addHistoryItem(history, `item ${index}`, index);
  assert.equal(history.length, MAX_HISTORY);
  assert.equal(history[0].text, "item 13");
  assert.equal(history.at(-1).text, "item 4");
});

test("copying the same text moves it to the front without duplication", () => {
  let history = addHistoryItem([], "alpha", 1);
  history = addHistoryItem(history, "beta", 2);
  history = addHistoryItem(history, "alpha", 3);
  assert.deepEqual(history.map(item => item.text), ["alpha", "beta"]);
  assert.equal(history[0].createdAt, 3);
});

test("invalid and blank persisted values are discarded", () => {
  const history = normalizeHistory([null, { text: "   " }, { text: "safe", createdAt: 10 }, { text: "safe", createdAt: 20 }]);
  assert.equal(history.length, 1);
  assert.equal(history[0].text, "safe");
});
