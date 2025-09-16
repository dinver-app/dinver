'use strict';

const { v4: uuidv4 } = require('uuid');

// Ephemeral thread store (deviceId + restaurantId)
// 7-day TTL, cap at 8 messages per thread. Suitable for lightweight UX.

const KEY = (deviceId, restaurantId) => `${deviceId}:${restaurantId}`;
const store = new Map();

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_MESSAGES = 8; // total messages (user + assistant)

function now() {
  return Date.now();
}

function purgeExpired() {
  const t = now();
  for (const [k, v] of store.entries()) {
    if (!v || v.expiresAt <= t) store.delete(k);
  }
}

setInterval(purgeExpired, 60 * 60 * 1000).unref(); // hourly cleanup

function newThread(deviceId, restaurantId) {
  const thread = {
    threadId: uuidv4(),
    deviceId,
    restaurantId,
    createdAt: now(),
    lastMessageAt: now(),
    messages: [], // { role: 'user'|'assistant', text, ts }
    messageCount: 0,
    readOnly: false,
    expiresAt: now() + TTL_MS,
  };
  store.set(KEY(deviceId, restaurantId), thread);
  return thread;
}

function get(deviceId, restaurantId) {
  if (!deviceId || !restaurantId) return null;
  const t = store.get(KEY(deviceId, restaurantId));
  if (!t) return null;
  if (t.expiresAt <= now()) {
    store.delete(KEY(deviceId, restaurantId));
    return null;
  }
  return t;
}

function getActiveThread(deviceId, restaurantId) {
  let t = get(deviceId, restaurantId);
  if (!t) return newThread(deviceId, restaurantId);
  if (t.readOnly || t.messageCount >= MAX_MESSAGES) {
    t.readOnly = true;
    return newThread(deviceId, restaurantId);
  }
  return t;
}

function append(deviceId, restaurantId, role, text) {
  const t = getActiveThread(deviceId, restaurantId);
  const entry = { role, text: String(text || ''), ts: now() };
  t.messages.push(entry);
  t.messageCount += 1;
  t.lastMessageAt = entry.ts;
  t.expiresAt = now() + TTL_MS;
  // clamp memory footprint
  if (t.messages.length > 16) t.messages.splice(0, t.messages.length - 16);
  if (t.messageCount >= MAX_MESSAGES) t.readOnly = true;
  return t;
}

module.exports = { get, getActiveThread, append, TTL_MS };
