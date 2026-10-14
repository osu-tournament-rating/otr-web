import { AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminReportsLoading() {
  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-8 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-semibold">Data Reports</h1>
            <p className="text-sm text-muted-foreground">
              Review and resolve user-submitted data issue reports
            </p>
          </div>
        </div>
      </header>
      <Card role="status" aria-label="Loading reports">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-full sm:w-44" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y overflow-hidden rounded-lg border">
            <Skeleton className="h-10 w-full rounded-none" />
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="flex h-14 items-center gap-4 px-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 w-40 md:block" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
