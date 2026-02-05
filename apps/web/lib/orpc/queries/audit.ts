import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';
import type { AuditEntityType } from '@otr/core/osu';

export const getEntityAuditTimelineCached = cache(
  async (entityType: AuditEntityType, entityId: number) =>
    orpc.audit.timeline({ entityType, entityId, limit: 50 })
);
