import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

const registry = new Registry();
registry.setDefaultLabels({ app: 'discord-bot' });
collectDefaultMetrics({ register: registry });

export const commandCalls = new Counter({
  name: 'discord_bot_commands_total',
  help: 'Interactions handled, by command and outcome',
  labelNames: ['command', 'status'] as const,
  registers: [registry],
});

export const commandDuration = new Histogram({
  name: 'discord_bot_command_duration_seconds',
  help: 'Time from the interaction to the final reply',
  labelNames: ['command'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 3, 5, 10],
  registers: [registry],
});

export const gatewayConnected = new Gauge({
  name: 'discord_bot_gateway_connected',
  help: '1 while the Discord gateway session is up',
  registers: [registry],
});

export const startMetricsServer = (port: number) =>
  Bun.serve({
    port,
    async fetch(request) {
      const { pathname } = new URL(request.url);
      if (pathname === '/metrics') {
        return new Response(await registry.metrics(), {
          headers: { 'Content-Type': registry.contentType },
        });
      }
      if (pathname === '/health') {
        return new Response('OK');
      }
      return new Response('Not Found', { status: 404 });
    },
  });
