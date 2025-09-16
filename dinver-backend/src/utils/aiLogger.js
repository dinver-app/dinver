'use strict';
const winston = require('winston');
const path = require('path');

// Kreiranje logs direktorija ako ne postoji
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const aiLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'ai-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'ai-debug.log'),
      level: 'debug',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

function logAiInteraction(data) {
  aiLogger.info('AI Interaction', {
    ...data,
    timestamp: new Date().toISOString(),
    type: 'interaction',
  });
}

function logIntentClassification(
  message,
  intent,
  confidence,
  restaurantQuery,
  menuTerm,
) {
  aiLogger.debug('Intent Classification', {
    message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    intent,
    confidence,
    restaurantQuery,
    menuTerm,
    timestamp: new Date().toISOString(),
    type: 'classification',
  });
}

function logMenuSearch(term, restaurantId, resultsCount, variations) {
  aiLogger.debug('Menu Search', {
    term,
    restaurantId,
    resultsCount,
    variations: variations?.slice(0, 5), // Log samo prve 5 varijacija
    timestamp: new Date().toISOString(),
    type: 'menu_search',
  });
}

function logContextUpdate(threadId, contextData) {
  aiLogger.debug('Context Update', {
    threadId,
    contextData,
    timestamp: new Date().toISOString(),
    type: 'context',
  });
}

function logError(error, context = {}) {
  aiLogger.error('AI Error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    type: 'error',
  });
}

function logPerformance(operation, duration, metadata = {}) {
  aiLogger.info('Performance', {
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString(),
    type: 'performance',
  });
}

module.exports = {
  aiLogger,
  logAiInteraction,
  logIntentClassification,
  logMenuSearch,
  logContextUpdate,
  logError,
  logPerformance,
};
