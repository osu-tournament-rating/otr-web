import { instrumentFetch, startTracing } from '@otr/core/tracing';

import { loadRootEnv } from '../../../lib/env/load-root-env';

loadRootEnv();

if (startTracing({ serviceName: 'otr-discord-bot' })) {
  instrumentFetch();
}
