import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';

import { ReportEntityType } from '@otr/core/osu';

import { Button } from '@/components/ui/button';
import { orpc } from '@/lib/orpc/orpc';
import AuditDetailCard from '@/components/audits/AuditDetailCard';
import AuditEntityState from '@/components/audits/AuditEntityState';
import AuditTimeline from '@/components/audits/AuditTimeline';

const VALID_TYPES = ['tournament', 'match', 'game', 'score'] as const;

const TYPE_TO_ENUM = {
  tournament: ReportEntityType.Tournament,
  match: ReportEntityType.Match,
  game: ReportEntityType.Game,
  score: ReportEntityType.Score,
} as const;

const paramsSchema = z.object({
  type: z.enum(VALID_TYPES),
  id: z.coerce.number().int().positive(),
});

type PageParams = Promise<{ type: string; id: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);

  if (!parsed.success) {
    return { title: 'Audit Not Found' };
  }

  return {
    title: `Audit #${parsed.data.id}`,
    description: `View details of audit log entry #${parsed.data.id}`,
  };
}

export default async function AuditDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);

  if (!parsed.success) {
    notFound();
  }

  const { type, id } = parsed.data;
  const entityType = TYPE_TO_ENUM[type];

  let detail;
  try {
    detail = await orpc.audits.get({ entityType, id });
  } catch {
    notFound();
  }

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 md:px-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/audits">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Audit Logs
          </Link>
        </Button>
      </div>

      <AuditDetailCard audit={detail.audit} />

      <AuditEntityState entityState={detail.entityState} />

      <AuditTimeline
        entityType={entityType}
        referenceIdLock={detail.audit.referenceIdLock}
        currentAuditId={id}
      />
    </div>
  );
}
