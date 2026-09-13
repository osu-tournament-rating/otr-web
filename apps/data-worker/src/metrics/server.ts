import { metricsRegistry } from './registry';

const METRICS_PORT = Number(process.env.METRICS_PORT ?? 9091);

export const startMetricsServer = () => {
  const server = Bun.serve({
    port: METRICS_PORT,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/metrics') {
        try {
          const metrics = await metricsRegistry.metrics();
          return new Response(metrics, {
            headers: { 'Content-Type': metricsRegistry.contentType },
          });
        } catch (error) {
          console.error('Failed to collect metrics', error);
          return new Response('Internal Server Error', { status: 500 });
        }
      }
      if (url.pathname === '/health') {
        return new Response('OK');
      }
      return new Response('Not Found', { status: 404 });
    },
  });
  console.log(`Metrics server listening on port ${METRICS_PORT}`);
  return server;
};
