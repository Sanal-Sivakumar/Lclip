import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_HISTORY = 10;

export function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const seen = new Set();
  const clean = [];
  for (const item of history) {
    const text = typeof item?.text === "string" ? item.text.slice(0, 50_000) : "";
    if (!text.trim() || seen.has(text)) continue;
    seen.add(text);
    clean.push({
      id: typeof item.id === "string" ? item.id : randomUUID(),
      text,
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now()
    });
    if (clean.length === MAX_HISTORY) break;
  }
  return clean;
}

export function addHistoryItem(history, text, now = Date.now()) {
  if (typeof text !== "string" || !text.trim()) return normalizeHistory(history);
  const value = text.slice(0, 50_000);
  return normalizeHistory([
    { id: randomUUID(), text: value, createdAt: now },
    ...normalizeHistory(history).filter(item => item.text !== value)
  ]);
}

export class StateStore {
  constructor(path) {
    this.path = path;
    this.state = {
      history: [],
      settings: {
        captureEnabled: true,
        autostartEnabled: true,
        closeAfterPaste: true,
        giphyApiKey: "",
        gifRating: "pg"
      }
    };
    this.writeQueue = Promise.resolve();
  }

  async load() {
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8"));
      this.state.history = normalizeHistory(parsed.history);
      this.state.settings = { ...this.state.settings, ...(parsed.settings || {}) };
    } catch {}
    return this.snapshot();
  }

  snapshot() {
    return structuredClone(this.state);
  }

  update(mutator) {
    mutator(this.state);
    this.state.history = normalizeHistory(this.state.history);
    const snapshot = this.snapshot();
    this.writeQueue = this.writeQueue.then(() => this.persist(snapshot)).catch(() => {});
    return snapshot;
  }

  async persist(snapshot = this.snapshot()) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, this.path);
    await chmod(this.path, 0o600).catch(() => {});
  }
}
