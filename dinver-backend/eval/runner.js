'use strict';

// Simple offline evaluator for Dinver AI
// Usage: node eval/runner.js [path_to_tests.jsonl]

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { chatAgent } = require('../src/dinver-ai/agent');

function readJsonl(filePath) {
  const abs = path.resolve(filePath);
  const content = fs.readFileSync(abs, 'utf8');
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function containsAny(text, arr) {
  if (!arr || arr.length === 0) return true;
  const t = (text || '').toLowerCase();
  return arr.some((s) => t.includes(String(s).toLowerCase())) || false;
}

async function run() {
  const testsPath = process.argv[2] || path.join(__dirname, 'tests.jsonl');
  const tests = readJsonl(testsPath);
  let passed = 0;
  const failures = [];

  for (const tc of tests) {
    const name = tc.name || tc.input?.message?.slice(0, 40) || 'test';
    try {
      const input = tc.input || {};
      // Check if API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.error('ERROR: OPENAI_API_KEY not found in environment');
        process.exit(1);
      }
      const res = await chatAgent({
        message: input.message,
        language: input.language,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusKm: input.radiusKm,
        threadId: input.threadId,
      });
      const reply = typeof res === 'string' ? res : res?.text || '';
      const okContains =
        containsAny(reply, tc.expect?.contains) &&
        containsAny(reply, tc.expect?.contains_any);
      const okLang =
        !tc.expect?.lang ||
        reply.toLowerCase().includes(tc.expect.lang === 'hr' ? '€' : '') ||
        true; // noop placeholder

      const ok = okContains && okLang;
      if (ok) passed += 1;
      else failures.push({ name, reason: 'content or lang mismatch', reply });
    } catch (e) {
      failures.push({ name, reason: e?.message || String(e) });
    }
  }

  const total = tests.length;
  const pct = total ? Math.round((passed / total) * 100) : 0;
  console.log(`\nEval: ${passed}/${total} passed (${pct}%).`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log('- ', f.name, '→', f.reason);
      if (f.reply) console.log('  reply:', f.reply);
    }
    process.exitCode = 1;
  }
}

run();
