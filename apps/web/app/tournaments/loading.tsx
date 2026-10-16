import { Trophy } from 'lucide-react';

import {
  ListToolbarSkeleton,
  PanelSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { TournamentListSkeleton } from '@/components/tournaments/list/TournamentList';

export default function TournamentsLoading() {
  return (
    <PageFrame>
      <PageHeader
        icon={Trophy}
        title="Tournaments"
        description="Browse tournament submissions and their review status. Only verified data is included in ratings."
      />
      <PanelSkeleton label="Loading tournaments">
        <ListToolbarSkeleton search sort filters rulesets={6} count />
        <TournamentListSkeleton />
      </PanelSkeleton>
    </PageFrame>
  );
}
