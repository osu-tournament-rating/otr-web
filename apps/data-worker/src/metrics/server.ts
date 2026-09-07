import { metricsRegistry } from './registry';

export const startMetricsServer = (
  port = Number(process.env.METRICS_PORT ?? 9091)
) => {
  const server = Bun.serve({
    port,
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
  console.log(`Metrics server listening on port ${port}`);
  return server;
};
