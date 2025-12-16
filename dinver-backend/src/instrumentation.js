const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const env = process.env.NODE_ENV || 'development';

// Only run in staging/production
if (process.env.NODE_ENV === 'staging') {
  const posthogApiKey = process.env.POSTHOG_API_KEY;
  const posthogHost = 'https://eu.i.posthog.com';

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': `dinver-backend-${env}`,
    }),
    logRecordProcessor: new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: 'https://eu.i.posthog.com/i/v1/logs',
        headers: {
          Authorization: `Bearer ${process.env.POSTHOG_API_KEY}`,
        },
      }),
    ),
    traceExporter: new OTLPTraceExporter({
      url: 'https://eu.i.posthog.com/v1/logs',
      headers: {
        Authorization: `Bearer ${process.env.POSTHOG_API_KEY}`,
      },
    }),

    // Enable all auto-instrumentations (Express, Http, Pg, Winston, etc.)
    instrumentations: [
      getNodeAutoInstrumentations({
        // Specific configs if needed
        '@opentelemetry/instrumentation-fs': { enabled: false }, // Usually too noisy
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true }, // Auto-logs SQL queries
        '@opentelemetry/instrumentation-winston': { enabled: true }, // Auto-ships your existing winston logs
      }),
    ],
  });

  sdk.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}