import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
      source: typeof item.source === "string" && item.source.trim() ? item.source.trim().slice(0, 80) : "Source unavailable"
    });
    if (clean.length === MAX_HISTORY) break;
  }
  return clean;
}

export function addHistoryItem(history, text, now = Date.now(), source = "Source unavailable") {
  if (typeof text !== "string" || !text.trim()) return normalizeHistory(history);
  const value = text.slice(0, 50_000);
  return normalizeHistory([
    { id: randomUUID(), text: value, createdAt: now, source: typeof source === "string" && source.trim() ? source.trim().slice(0, 80) : "Source unavailable" },
    ...normalizeHistory(history).filter(item => item.text !== value)
  ]);
}

export class StateStore {
  constructor(path, { onPersistenceStatus } = {}) {
    this.path = path;
    this.onPersistenceStatus = onPersistenceStatus;
    this.state = {
      history: [],
      settings: {
        captureEnabled: true,
        autostartEnabled: true,
        giphyApiKey: "",
        gifRating: "pg"
      }
    };
    this.writeQueue = Promise.resolve();
    this.pendingWrites = 0;
    this.persistenceStatus = {
      state: "saved",
      message: "Changes are saved locally",
      lastSavedAt: null
    };
  }

  async load() {
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8"));
      this.state.history = normalizeHistory(parsed.history);
      const saved = parsed.settings || {};
      this.state.settings = {
        captureEnabled: typeof saved.captureEnabled === "boolean" ? saved.captureEnabled : this.state.settings.captureEnabled,
        autostartEnabled: typeof saved.autostartEnabled === "boolean" ? saved.autostartEnabled : this.state.settings.autostartEnabled,
        giphyApiKey: typeof saved.giphyApiKey === "string" ? saved.giphyApiKey.trim().slice(0, 180) : "",
        gifRating: ["g", "pg", "pg-13"].includes(saved.gifRating) ? saved.gifRating : "pg"
      };
      await chmod(dirname(this.path), 0o700);
      await chmod(this.path, 0o600);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        const detail = error instanceof SyntaxError
          ? "state.json is not valid JSON"
          : String(error?.message || "unknown storage error");
        this.persistenceStatus = {
          state: "error",
          message: `Could not load local data: ${detail}`.slice(0, 220),
          lastSavedAt: null
        };
        this.#emitPersistenceStatus();
      }
    }
    return this.snapshot();
  }

  snapshot() {
    return structuredClone(this.state);
  }

  restore(snapshot) {
    this.state = structuredClone(snapshot);
    return this.snapshot();
  }

  persistenceSnapshot() {
    return structuredClone({ ...this.persistenceStatus, pending: this.pendingWrites });
  }

  get hasPendingWrites() {
    return this.pendingWrites > 0;
  }

  #emitPersistenceStatus() {
    this.onPersistenceStatus?.(this.persistenceSnapshot());
  }

  #queuePersist(snapshot) {
    this.pendingWrites += 1;
    this.persistenceStatus = {
      state: "saving",
      message: "Saving changes locally",
      lastSavedAt: this.persistenceStatus.lastSavedAt
    };
    this.#emitPersistenceStatus();
    const write = this.writeQueue
      .then(() => this.persist(snapshot))
      .then(() => {
        this.pendingWrites -= 1;
        this.persistenceStatus = {
          state: this.pendingWrites ? "saving" : "saved",
          message: this.pendingWrites ? "Saving changes locally" : "Changes are saved locally",
          lastSavedAt: Date.now()
        };
        this.#emitPersistenceStatus();
        return snapshot;
      }, error => {
        this.pendingWrites -= 1;
        this.persistenceStatus = {
          state: "error",
          message: String(error?.message || "Could not save local data").slice(0, 220),
          lastSavedAt: this.persistenceStatus.lastSavedAt
        };
        this.#emitPersistenceStatus();
        throw error;
      });
    this.writeQueue = write.catch(() => {});
    return write;
  }

  #applyUpdate(mutator) {
    mutator(this.state);
    this.state.history = normalizeHistory(this.state.history);
    const snapshot = this.snapshot();
    return { snapshot, write: this.#queuePersist(snapshot) };
  }

  update(mutator) {
    const operation = this.#applyUpdate(mutator);
    operation.write.catch(() => {});
    return operation.snapshot;
  }

  async updateAndPersist(mutator) {
    const operation = this.#applyUpdate(mutator);
    await operation.write;
    return operation.snapshot;
  }

  async flush() {
    await this.writeQueue;
    if (this.persistenceStatus.state === "error") throw new Error(this.persistenceStatus.message);
  }

  async persist(snapshot = this.snapshot()) {
    const directory = dirname(this.path);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const temporary = `${this.path}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, this.path);
      await chmod(this.path, 0o600);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }
}
