import { cache } from 'react';
import type { AuditEntityType } from '@otr/core/osu';

import { orpc } from '@/lib/orpc/orpc';

export const getAuditEntityNameCached = cache(
  async (entityType: AuditEntityType, entityId: number) =>
    orpc.audit.entityName({ entityType, entityId })
);
