import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

diag.setLogger(
  new DiagConsoleLogger(),
  process.env.NODE_ENV === 'production' ? DiagLogLevel.INFO : DiagLogLevel.DEBUG
);

export const exporter = new OTLPTraceExporter({
  url: process.env.COLLECTOR_CONNECTION,
});
