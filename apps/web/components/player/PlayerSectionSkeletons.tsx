import { Music, Trophy } from 'lucide-react';

import {
  LoadMoreSkeleton,
  PanelSkeleton,
  RowListSkeleton,
  SectionHeaderSkeleton,
} from '@/components/kit/feedback/Skeletons';

// The real section titles, so nothing shifts when the content arrives. Each
// list shows its first rows and a "Show more" footer, as the loaded panels
// do for a player with more than fit at first.

/** Five tournament rows: name and facts, then two small stats and the Matches toggle. */
export function PlayerTournamentsSkeleton({ label }: { label?: string }) {
  return (
    <PanelSkeleton label={label}>
      <SectionHeaderSkeleton icon={Trophy} title="Tournament history" />
      <RowListSkeleton leading="none" stats={2} statsAction />
      <LoadMoreSkeleton />
    </PanelSkeleton>
  );
}

/** Three beatmap rows: cover, title, artist, then the star rating and metrics. */
export function PlayerBeatmapsSkeleton({ label }: { label?: string }) {
  return (
    <PanelSkeleton label={label}>
      <SectionHeaderSkeleton icon={Music} title="Pooled beatmaps" />
      <RowListSkeleton rows={3} leading="cover" trailing={false} meta="badge" />
      <LoadMoreSkeleton />
    </PanelSkeleton>
  );
}
