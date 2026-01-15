import { History } from 'lucide-react';
import { Metadata } from 'next';

import { orpc } from '@/lib/orpc/orpc';
import AuditExplorer from '@/components/audits/explorer/AuditExplorer';

export const metadata: Metadata = {
  title: 'Audit Explorer',
  description:
    'Explore the complete audit history of all data changes in the o!TR system organized by tournament.',
};

export default async function AuditsPage() {
  const filterOptions = await orpc.audits.filterOptions();

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 md:gap-6 md:px-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <History className="text-primary h-8 w-8" />
          <h1 className="text-2xl font-bold sm:text-3xl">Audit Explorer</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Explore audit history organized by tournament. Click a tournament to
          view its complete change timeline.
        </p>
      </div>

      <AuditExplorer filterOptions={filterOptions} />
    </div>
  );
}
