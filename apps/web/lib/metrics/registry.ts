import { Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({ app: 'web' });
collectDefaultMetrics({ register: metricsRegistry });
