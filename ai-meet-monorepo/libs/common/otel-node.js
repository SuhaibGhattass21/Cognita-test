const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: undefined, // set OTLP exporter via env or configure here
  instrumentations: [getNodeAutoInstrumentations()]
});

module.exports = { sdk };