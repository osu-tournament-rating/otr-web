'use client';

import { Calendar, Gamepad2, Trophy, Users } from 'lucide-react';
import StatCard from '../shared/StatCard';
import type { BeatmapStatsSummary } from '@/lib/orpc/schema/beatmapStats';
import { format } from 'date-fns';

interface BeatmapStatsCardProps {
  summary: BeatmapStatsSummary;
}

export default function BeatmapStatsCard({ summary }: BeatmapStatsCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <StatCard
        icon={<Gamepad2 className="h-5 w-5" />}
        label="Games Played"
        value={summary.totalGameCount.toLocaleString()}
      />
      <StatCard
        icon={<Trophy className="h-5 w-5" />}
        label="Tournaments"
        value={summary.totalTournamentCount.toLocaleString()}
      />
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Unique Players"
        value={summary.totalPlayerCount.toLocaleString()}
      />
      <StatCard
        icon={<Calendar className="h-5 w-5" />}
        label="First Played"
        value={formatDate(summary.firstPlayedAt)}
      />
    </div>
  );
}
