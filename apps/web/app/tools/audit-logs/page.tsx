import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AuditLogView from '@/components/audit/AuditLogView';

export const metadata: Metadata = {
  title: 'Audit Logs',
};

export default function AuditLogsPage() {
  return (
    <div className="container mx-auto flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Audit Logs</h1>
        <p className="text-muted-foreground text-sm">
          View the history of changes made to tournaments, matches, games, and
          scores.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        }
      >
        <AuditLogView />
      </Suspense>
    </div>
  );
}
