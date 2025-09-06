const DEFAULT_TTL_MS = 20 * 60 * 1000; // 20 minutes

class ThreadContextStore {
  constructor() {
    this.map = new Map();
  }

  set(threadId, data, ttlMs = DEFAULT_TTL_MS) {
    const expiresAt = Date.now() + ttlMs;
    this.map.set(threadId, { ...data, _expiresAt: expiresAt });
  }

  get(threadId) {
    const entry = this.map.get(threadId);
    if (!entry) return null;
    if (entry._expiresAt && entry._expiresAt < Date.now()) {
      this.map.delete(threadId);
      return null;
    }
    return { ...entry };
  }

  update(threadId, partial, ttlMs = DEFAULT_TTL_MS) {
    const current = this.get(threadId) || {};
    this.set(threadId, { ...current, ...partial }, ttlMs);
  }

  clear(threadId) {
    this.map.delete(threadId);
  }
}

module.exports = new ThreadContextStore();
