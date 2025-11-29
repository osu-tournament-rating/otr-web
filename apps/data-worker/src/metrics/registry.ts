import { Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({ app: 'data-worker' });
collectDefaultMetrics({ register: metricsRegistry });
