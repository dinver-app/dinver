'use strict';

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
const metricsFile = path.join(logsDir, 'ai-metrics.ndjson');
const feedbackFile = path.join(logsDir, 'ai-feedback.ndjson');

function ensureDir() {
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  } catch {}
}

function writeLine(file, obj) {
  ensureDir();
  try {
    fs.appendFileSync(file, JSON.stringify(obj) + '\n');
  } catch (e) {
    // silent fail to avoid crashing request path
    console.error('[metrics] write error:', e?.message || e);
  }
}

function logAiInteraction(event) {
  const payload = {
    ts: new Date().toISOString(),
    type: 'interaction',
    ...event,
  };
  writeLine(metricsFile, payload);
}

function logFeedback(event) {
  const payload = {
    ts: new Date().toISOString(),
    type: 'feedback',
    ...event,
  };
  writeLine(feedbackFile, payload);
}

module.exports = { logAiInteraction, logFeedback };
