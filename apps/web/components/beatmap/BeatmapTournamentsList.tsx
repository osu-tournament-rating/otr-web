'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ModsEnumHelper } from '@/lib/enums';
import type { BeatmapTournamentUsage } from '@/lib/orpc/schema/beatmapStats';
import { Gamepad2 } from 'lucide-react';
import { format } from 'date-fns';

interface BeatmapTournamentsListProps {
  tournaments: BeatmapTournamentUsage[];
  className?: string;
}

export default function BeatmapTournamentsList({
  tournaments,
  className,
}: BeatmapTournamentsListProps) {
  const sortedTournaments = [...tournaments].sort((a, b) => {
    const dateA = a.tournament.endTime
      ? new Date(a.tournament.endTime).getTime()
      : 0;
    const dateB = b.tournament.endTime
      ? new Date(b.tournament.endTime).getTime()
      : 0;
    return dateB - dateA;
  });

  if (sortedTournaments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tournament Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This beatmap has not been used in any verified tournaments.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatModLabel = (mods: number) => {
    const metadata = ModsEnumHelper.getMetadata(mods);
    const label = metadata
      .map((meta) => meta.text)
      .join('')
      .replace(/NF/g, '')
      .replace(/SO/g, '');
    return label === '' ? 'NM' : label;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tournament Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedTournaments.slice(0, 10).map((item) => (
          <Link
            key={item.tournament.id}
            href={`/tournaments/${item.tournament.id}`}
            className="bg-popover hover:bg-accent flex items-center justify-between rounded-lg p-3 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{item.tournament.name}</div>
              <div className="text-muted-foreground text-sm">
                {item.tournament.endTime
                  ? format(new Date(item.tournament.endTime), 'MMM yyyy')
                  : 'Unknown date'}
              </div>
            </div>
            <div className="ml-4 flex items-center gap-3 text-sm">
              <div className="text-muted-foreground">
                {formatModLabel(item.mostCommonMod)}
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{item.gameCount}</span>
                <Gamepad2 className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
        {sortedTournaments.length > 10 && (
          <p className="text-muted-foreground pt-2 text-center text-sm">
            And {sortedTournaments.length - 10} more tournaments...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
