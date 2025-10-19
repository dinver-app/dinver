'use strict';

class LRUCache {
  constructor(maxSize = 100, ttlMs = 120000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  generateKey(params) {
    const sortedParams = {};
    Object.keys(params)
      .sort()
      .forEach((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          sortedParams[key] = value.sort().join(',');
        } else if (typeof value === 'object' && value !== null) {
          sortedParams[key] = JSON.stringify(value);
        } else {
          sortedParams[key] = value;
        }
      });

    return JSON.stringify(sortedParams);
  }

  get(params) {
    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(params, value) {
    const key = this.generateKey(params);
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }

  stats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [_, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      validEntries,
      expiredEntries,
      ttlMs: this.ttlMs,
    };
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) keysToDelete.push(key);
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    return keysToDelete.length;
  }
}

const globalSearchCache = new LRUCache(
  parseInt(process.env.AI_CACHE_MAX_SIZE || '100'),
  parseInt(process.env.AI_CACHE_TTL_MS || '120000'),
);

setInterval(
  () => {
    const cleaned = globalSearchCache.cleanup();
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
  },
  5 * 60 * 1000,
);

module.exports = {
  LRUCache,
  globalSearchCache,
};
