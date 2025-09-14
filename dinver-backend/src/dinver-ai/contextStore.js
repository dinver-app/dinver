'use strict';

// Simple in-memory context store with TTL per thread
const store = new Map(); // key -> { data, expiresAt }
const DEFAULT_TTL_MS = 20 * 60 * 1000; // 20 minutes

function now() {
  return Date.now();
}

function get(threadId) {
  if (!threadId) return null;
  const entry = store.get(threadId);
  if (!entry) return null;
  if (entry.expiresAt < now()) {
    store.delete(threadId);
    return null;
  }
  return entry.data;
}

function set(threadId, data, ttlMs = DEFAULT_TTL_MS) {
  if (!threadId) return;
  store.set(threadId, { data, expiresAt: now() + ttlMs });
}

module.exports = { get, set };
