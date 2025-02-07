import { registerOTel } from '@vercel/otel';
import { exporter } from '@/instrumentation.node';

export async function register() {
  registerOTel({
    serviceName: 'otr-web',
    traceExporter: exporter,
  });
}
