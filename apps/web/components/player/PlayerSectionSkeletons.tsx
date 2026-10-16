import { Music, Trophy } from 'lucide-react';

import {
  PanelSkeleton,
  RowListSkeleton,
  SectionHeaderSkeleton,
} from '@/components/kit/feedback/Skeletons';

// The real section titles, so nothing shifts when the content arrives.

export function PlayerTournamentsSkeleton({ label }: { label?: string }) {
  return (
    <PanelSkeleton label={label}>
      <SectionHeaderSkeleton icon={Trophy} title="Tournament history" />
      <RowListSkeleton leading="none" />
    </PanelSkeleton>
  );
}

export function PlayerBeatmapsSkeleton({ label }: { label?: string }) {
  return (
    <PanelSkeleton label={label}>
      <SectionHeaderSkeleton icon={Music} title="Pooled beatmaps" />
      <RowListSkeleton rows={3} leading="cover" trailing={false} />
    </PanelSkeleton>
  );
}
