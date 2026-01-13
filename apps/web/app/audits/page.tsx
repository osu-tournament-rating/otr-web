import { History } from 'lucide-react';
import { Metadata } from 'next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auditListFilterSchema, defaultAuditListFilter } from '@/lib/schema';
import AuditList from '@/components/audits/AuditList';
import AuditListFilter from '@/components/audits/AuditListFilter';

export const metadata: Metadata = {
  title: 'Audit Logs',
  description:
    'View the complete audit history of all data changes in the o!TR system for full transparency.',
};

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const filter = auditListFilterSchema.parse({
    ...defaultAuditListFilter,
    ...params,
  });

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 md:gap-2 md:px-0">
      <div className="mb-4 flex flex-col gap-2 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <History className="text-primary h-8 w-8" />
          <h1 className="text-2xl font-bold sm:text-3xl">Audit Logs</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          View the complete history of all data changes in the system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditListFilter filter={filter} />
        </CardContent>
      </Card>

      <AuditList filter={filter} />
    </div>
  );
}
