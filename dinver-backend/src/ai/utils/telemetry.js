'use strict';

/**
 * Telemetry & Logging for AI requests
 * Tracks intent, confidence, tools used, latency, results
 */

const fs = require('fs');
const path = require('path');

const TELEMETRY_ENABLED = process.env.AI_TELEMETRY_ENABLED !== 'false';
const LOG_FILE = process.env.AI_TELEMETRY_LOG_FILE || path.join(__dirname, '../../logs/ai-telemetry.jsonl');

/**
 * Ensure log directory exists
 */
function ensureLogDirectory() {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Log AI request telemetry
 * @param {object} data - Telemetry data
 * @param {string} data.intent - Classified intent
 * @param {number} data.confidence - Router confidence score
 * @param {Array<string>} data.tools_used - Tools called during execution
 * @param {number} data.latency_ms - Total request latency
 * @param {number} data.result_count - Number of results returned
 * @param {boolean} data.had_results - Whether results were found
 * @param {string} data.user_id - Optional user ID
 * @param {string} data.message - User message (first 100 chars)
 * @param {string} data.language - hr/en
 * @param {boolean} data.success - Whether request succeeded
 * @param {string} data.error - Error message if failed
 */
function logAIRequest(data) {
  if (!TELEMETRY_ENABLED) return;

  try {
    ensureLogDirectory();

    const entry = {
      timestamp: new Date().toISOString(),
      intent: data.intent,
      confidence: data.confidence,
      tools_used: data.tools_used || [],
      latency_ms: data.latency_ms,
      result_count: data.result_count || 0,
      had_results: data.had_results || false,
      user_id: data.user_id || null,
      message: (data.message || '').substring(0, 100), // First 100 chars only
      language: data.language || 'hr',
      success: data.success !== false,
      error: data.error || null,
    };

    // Write as JSON Lines (one JSON object per line)
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');

    // Also log to console if in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AI Telemetry]', entry);
    }
  } catch (error) {
    console.error('[Telemetry] Failed to log AI request:', error);
  }
}

/**
 * Calculate clarify rate from recent logs
 * @param {number} hours - How many hours back to check (default 24)
 * @returns {object} { total, clarify_count, clarify_rate }
 */
function getClarifyRate(hours = 24) {
  if (!TELEMETRY_ENABLED || !fs.existsSync(LOG_FILE)) {
    return { total: 0, clarify_count: 0, clarify_rate: 0 };
  }

  try {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    let total = 0;
    let clarifyCount = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const entryTime = new Date(entry.timestamp);

        if (entryTime >= cutoffTime) {
          total++;
          if (entry.intent === 'CLARIFY') {
            clarifyCount++;
          }
        }
      } catch (e) {
        // Skip malformed lines
        continue;
      }
    }

    const clarifyRate = total > 0 ? clarifyCount / total : 0;

    return {
      total,
      clarify_count: clarifyCount,
      clarify_rate: clarifyRate,
    };
  } catch (error) {
    console.error('[Telemetry] Failed to calculate clarify rate:', error);
    return { total: 0, clarify_count: 0, clarify_rate: 0 };
  }
}

/**
 * Get aggregated stats from telemetry logs
 * @param {number} hours - How many hours back to analyze
 * @returns {object} Aggregated statistics
 */
function getStats(hours = 24) {
  if (!TELEMETRY_ENABLED || !fs.existsSync(LOG_FILE)) {
    return {
      total_requests: 0,
      success_count: 0,
      error_count: 0,
      avg_latency_ms: 0,
      by_intent: {},
      clarify_rate: 0,
    };
  }

  try {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    let total = 0;
    let successCount = 0;
    let errorCount = 0;
    let totalLatency = 0;
    const byIntent = {};

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const entryTime = new Date(entry.timestamp);

        if (entryTime >= cutoffTime) {
          total++;

          if (entry.success) successCount++;
          else errorCount++;

          if (entry.latency_ms) totalLatency += entry.latency_ms;

          // Group by intent
          const intent = entry.intent || 'UNKNOWN';
          if (!byIntent[intent]) {
            byIntent[intent] = { count: 0, success: 0, avg_confidence: 0, total_confidence: 0 };
          }
          byIntent[intent].count++;
          if (entry.success) byIntent[intent].success++;
          if (entry.confidence) {
            byIntent[intent].total_confidence += entry.confidence;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Calculate averages
    for (const intent of Object.keys(byIntent)) {
      const data = byIntent[intent];
      data.avg_confidence = data.count > 0 ? data.total_confidence / data.count : 0;
      delete data.total_confidence;
    }

    const avgLatency = total > 0 ? totalLatency / total : 0;
    const clarifyCount = byIntent.CLARIFY?.count || 0;
    const clarifyRate = total > 0 ? clarifyCount / total : 0;

    return {
      total_requests: total,
      success_count: successCount,
      error_count: errorCount,
      avg_latency_ms: Math.round(avgLatency),
      by_intent: byIntent,
      clarify_rate: clarifyRate,
    };
  } catch (error) {
    console.error('[Telemetry] Failed to get stats:', error);
    return {
      total_requests: 0,
      success_count: 0,
      error_count: 0,
      avg_latency_ms: 0,
      by_intent: {},
      clarify_rate: 0,
    };
  }
}

module.exports = {
  logAIRequest,
  getClarifyRate,
  getStats,
};
