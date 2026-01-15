import Link from 'next/link';
import { ArrowLeft, History } from 'lucide-react';

import { ReportEntityType } from '@otr/core/osu';

import { Button } from '@/components/ui/button';
import AuditEntityState from './AuditEntityState';
import AuditTimeline from './AuditTimeline';

type EntityState = {
  exists: boolean;
  data: unknown;
};

interface EntityAuditPageProps {
  entityType: ReportEntityType;
  referenceIdLock: number;
  entityDisplayName: string;
  backHref: string;
  backLabel: string;
  entityState: EntityState;
}

export default function EntityAuditPage({
  entityType,
  referenceIdLock,
  entityDisplayName,
  backHref,
  backLabel,
  entityState,
}: EntityAuditPageProps) {
  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 md:px-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <History className="text-primary h-8 w-8" />
        <h1 className="text-2xl font-bold sm:text-3xl">
          Audit History: {entityDisplayName}
        </h1>
      </div>

      <AuditEntityState
        entityState={{
          exists: entityState.exists,
          data: entityState.data,
          entityType,
          entityDisplayName,
        }}
      />

      <AuditTimeline
        entityType={entityType}
        referenceIdLock={referenceIdLock}
      />
    </div>
  );
}
