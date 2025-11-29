import { createLogger } from '@otr/core/logging';

export type { Logger } from '@otr/core/logging';

export const consoleLogger = createLogger('otr-data-worker');
