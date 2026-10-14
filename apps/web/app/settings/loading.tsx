import { Settings } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <Settings className="size-6 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-semibold">Settings</h1>
        </div>
      </header>
      <div role="status" aria-label="Loading settings" className="space-y-8">
        <Skeleton className="h-[12.25rem] w-full rounded-xl" />
        <Skeleton className="h-[22rem] w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
