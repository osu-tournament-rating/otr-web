import { Counter, Gauge, Histogram } from 'prom-client';
import { metricsRegistry } from './registry';

export const rateLimiterRequests = new Counter({
  name: 'data_worker_rate_limiter_requests_total',
  help: 'Rate limiter requests',
  labelNames: ['limiter', 'status'] as const,
  registers: [metricsRegistry],
});

export const rateLimiterQueuedTasks = new Gauge({
  name: 'data_worker_rate_limiter_queued_tasks',
  help: 'Tasks waiting in rate limiter queue',
  labelNames: ['limiter'] as const,
  registers: [metricsRegistry],
});

export const rateLimiterWaitDuration = new Histogram({
  name: 'data_worker_rate_limiter_wait_seconds',
  help: 'Time spent waiting for rate limiter',
  labelNames: ['limiter'] as const,
  buckets: [0.1, 1, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

export const rateLimiterRemainingTokens = new Gauge({
  name: 'data_worker_rate_limiter_remaining_tokens',
  help: 'Remaining tokens in current window',
  labelNames: ['limiter'] as const,
  registers: [metricsRegistry],
});
