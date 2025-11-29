import { Counter, Histogram, Gauge } from 'prom-client';
import { metricsRegistry } from './registry';

export const queueMessagesProcessed = new Counter({
  name: 'data_worker_queue_messages_processed_total',
  help: 'Total queue messages processed',
  labelNames: ['queue', 'status'] as const,
  registers: [metricsRegistry],
});

export const queueMessageDuration = new Histogram({
  name: 'data_worker_queue_message_duration_seconds',
  help: 'Queue message processing duration',
  labelNames: ['queue'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

export const queueMessagesInFlight = new Gauge({
  name: 'data_worker_queue_messages_in_flight',
  help: 'Messages currently being processed',
  labelNames: ['queue'] as const,
  registers: [metricsRegistry],
});
