import { ListRestart, ShieldCheck, UserSearch } from 'lucide-react';

import {
  PanelSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';

/** One line of 14px text while it loads; the span keeps the line's height. */
function Line({ className }: { className: string }) {
  return (
    <span className="text-sm">
      <SkeletonText className={`max-w-full ${className}`} />
    </span>
  );
}

function FieldSkeleton({ inputClassName }: { inputClassName: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SkeletonText className="block h-3.5 w-20" />
      <SkeletonText className={`block w-full ${inputClassName}`} />
    </div>
  );
}

export default function AdminLoading() {
  return (
    <PageFrame>
      <PageHeader icon={ShieldCheck} title="Admin" />
      <PanelSkeleton label="Loading admin tools">
        <SectionHeaderSkeleton
          icon={UserSearch}
          title="User lookup"
          meta={false}
        />
        <div className="flex flex-col gap-4 p-4">
          <Line className="w-96" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FieldSkeleton inputClassName="h-9" />
            <SkeletonText className="block h-9 w-full sm:w-28" />
          </div>
        </div>
      </PanelSkeleton>
      <PanelSkeleton>
        <SectionHeaderSkeleton
          icon={ListRestart}
          title="Mass enqueue"
          meta={false}
        />
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <Line className="w-full" />
            <Line className="w-64" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton inputClassName="h-[10.5rem]" />
            <FieldSkeleton inputClassName="h-[10.5rem]" />
          </div>
          <div className="flex flex-col gap-2">
            <SkeletonText className="block h-3.5 w-14" />
            <Line className="w-56" />
          </div>
        </div>
        <div className="flex justify-end border-t bg-muted/30 px-4 py-3">
          <SkeletonText className="block h-9 w-full sm:w-36" />
        </div>
      </PanelSkeleton>
    </PageFrame>
  );
}
