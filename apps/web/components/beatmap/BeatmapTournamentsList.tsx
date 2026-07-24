'use client';

import { Library, Plus } from 'lucide-react';
import { useState } from 'react';

import BeatmapTournamentCard from './BeatmapTournamentCard';
import { Button } from '@/components/ui/button';
import type { BeatmapTournamentUsage } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapTournamentsListProps {
  tournaments: BeatmapTournamentUsage[];
  beatmapOsuId: number;
}

export default function BeatmapTournamentsList({
  tournaments,
  beatmapOsuId,
}: BeatmapTournamentsListProps) {
  const [displayCount, setDisplayCount] = useState(8);
  const sortedTournaments = [...tournaments].sort((a, b) => {
    const dateA = a.tournament.endTime
      ? new Date(a.tournament.endTime).getTime()
      : 0;
    const dateB = b.tournament.endTime
      ? new Date(b.tournament.endTime).getTime()
      : 0;
    return dateB - dateA;
  });

  return (
    <section
      data-testid="beatmap-tournaments-list"
      className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Library
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-semibold">Tournament pools</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {tournaments.length}{' '}
          {tournaments.length === 1 ? 'pool record' : 'pool records'}
        </span>
      </div>

      {tournaments.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No pool records.
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[8.25rem_minmax(12rem,1fr)_11rem_5rem_7rem_7.5rem] gap-3 border-b bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase lg:grid"
          >
            <span>Status</span>
            <span>Tournament</span>
            <span>Context</span>
            <span>Mod</span>
            <span>Date</span>
            <span className="text-right">Games</span>
          </div>
          <div className="divide-y">
            {sortedTournaments.slice(0, displayCount).map((tournament) => (
              <BeatmapTournamentCard
                key={tournament.tournament.id}
                tournament={tournament}
                beatmapOsuId={beatmapOsuId}
              />
            ))}
          </div>
        </>
      )}

      {tournaments.length > displayCount && (
        <div className="border-t p-3">
          <Button
            data-testid="beatmap-tournaments-show-more"
            type="button"
            variant="outline"
            className="w-full"
            onClick={() =>
              setDisplayCount(Math.min(displayCount + 20, tournaments.length))
            }
          >
            <Plus aria-hidden="true" />
            Show {Math.min(20, tournaments.length - displayCount)} more
          </Button>
        </div>
      )}
    </section>
  );
}
