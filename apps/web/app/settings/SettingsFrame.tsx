import { KeyRound, Keyboard, Settings, UserX, Users } from 'lucide-react';
import type * as React from 'react';

import {
  PanelSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { cn } from '@/lib/utils';

/** The settings page's frame and header, shared with its loading screen. */
export function SettingsFrame({
  children,
  ...props
}: React.ComponentProps<typeof PageFrame>) {
  return (
    <PageFrame {...props}>
      <PageHeader icon={Settings} title="Settings" />
      {children}
    </PageFrame>
  );
}

/** One line of 14px text while it loads; the span keeps the line's height. */
function Line({ className }: { className?: string }) {
  return (
    <span className="text-sm">
      <SkeletonText className={cn('max-w-full', className)} />
    </span>
  );
}

export function FriendsPanelSkeleton({ label }: { label?: string }) {
  return (
    <PanelSkeleton label={label}>
      <SectionHeaderSkeleton icon={Users} title="Friends" meta={false} />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <Line className="w-96" />
          <Line className="w-36" />
        </div>
        <SkeletonText className="block h-9 w-36" />
      </div>
    </PanelSkeleton>
  );
}

export function ApiKeysPanelSkeleton() {
  return (
    <PanelSkeleton>
      <SectionHeaderSkeleton icon={KeyRound} title="API keys" />
      <div className="flex flex-col gap-4 p-4">
        <Line className="w-80" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <SkeletonText className="block h-3.5 w-16" />
            <SkeletonText className="block h-9 w-full" />
          </div>
          <SkeletonText className="block h-9 w-full sm:w-36" />
        </div>
      </div>
      <TableSkeleton
        className="border-t"
        rows={1}
        cellHeight="h-9"
        columns={[
          { label: 'Key' },
          { label: 'Rate limit', width: 'w-48' },
          { label: 'Created', width: 'w-52', showFrom: 'lg' },
          { label: '', width: 'w-24', align: 'end' },
        ]}
      />
      <div className="flex flex-col gap-1 border-t px-4 py-3">
        <span className="text-xs">
          <SkeletonText className="h-3 w-96 max-w-full" />
        </span>
      </div>
    </PanelSkeleton>
  );
}

export function ShortcutsPanelSkeleton() {
  return (
    <PanelSkeleton>
      <SectionHeaderSkeleton
        icon={Keyboard}
        title="Keyboard shortcuts"
        meta={false}
      />
      <div className="flex flex-col gap-4 p-4">
        <Line className="w-72" />
        <div className="flex items-center justify-between gap-4">
          <Line className="w-48" />
          <SkeletonText className="block h-[1.15rem] w-8 rounded-full" />
        </div>
      </div>
    </PanelSkeleton>
  );
}

export function DangerZonePanelSkeleton() {
  return (
    <PanelSkeleton>
      <SectionHeaderSkeleton icon={UserX} title="Delete account" meta={false} />
      <div className="p-4">
        <SkeletonText className="block h-14 w-full rounded-lg" />
      </div>
    </PanelSkeleton>
  );
}
