import { ShieldCheck } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-semibold">Admin</h1>
        </div>
      </header>
      <div role="status" aria-label="Loading admin tools" className="space-y-6">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-[25.5rem] w-full rounded-xl" />
      </div>
    </div>
  );
}
