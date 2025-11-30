'use client';

import { RulesetEnumHelper } from '@/lib/enums';
import { formatRankRange } from '@/lib/utils/number';
import Link from 'next/link';
import VerificationBadge from '../badges/VerificationBadge';
import { LazerBadge } from '../badges/LazerBadge';
import { Card } from '../ui/card';
import RulesetIcon from '../icons/RulesetIcon';
import ModIconset from '../icons/ModIconset';
import { Users, Target, Calendar, Eye, EyeOff, Gamepad2, Trophy, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BeatmapTournamentUsage } from '@/lib/orpc/schema/beatmapStats';

function formatRankRangeDisplay(rankRange: number): string {
  if (rankRange === 1) return 'Open';
  return formatRankRange(rankRange);
}

interface BeatmapTournamentCardProps {
  tournament: BeatmapTournamentUsage;
}

export default function BeatmapTournamentCard({
  tournament,
}: BeatmapTournamentCardProps) {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const endDate = tournament.tournament.endTime
    ? new Date(tournament.tournament.endTime)
    : null;

  const cardContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Link href={`/tournaments/${tournament.tournament.id}`}>
          <h2 className="text-lg font-semibold leading-tight sm:text-xl md:text-2xl">
            {tournament.tournament.name}
          </h2>
        </Link>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {tournament.tournament.abbreviation && (
            <span className="text-muted-foreground font-mono text-sm">
              {tournament.tournament.abbreviation}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="text-muted-foreground flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <VerificationBadge
            verificationStatus={tournament.tournament.verificationStatus}
            entityType="tournament"
            displayText={true}
          />

          <LazerBadge isLazer={tournament.tournament.isLazer} />

          <div className="flex items-center gap-1.5">
            <RulesetIcon
              ruleset={tournament.tournament.ruleset}
              width={16}
              height={16}
              className="flex-shrink-0 fill-current"
            />
            <span className="truncate">
              {RulesetEnumHelper.getMetadata(tournament.tournament.ruleset).text}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {tournament.tournament.lobbySize}v{tournament.tournament.lobbySize}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Gamepad2 className="h-4 w-4 flex-shrink-0" />
            <span>
              {tournament.gameCount} {tournament.gameCount === 1 ? 'game' : 'games'}
            </span>
          </div>

          {endDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">
                {format(endDate, 'MMM yyyy')}
              </span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className={cn(
            '-my-1 ml-auto h-8 gap-2 px-3 text-sm sm:ml-0',
            'hover:bg-accent hover:text-accent-foreground',
            'border-input border',
            isDetailsVisible && 'bg-accent text-accent-foreground'
          )}
          onClick={(e) => {
            e.preventDefault();
            setIsDetailsVisible(!isDetailsVisible);
          }}
        >
          {isDetailsVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Details
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="p-4 font-sans sm:p-6">
      {cardContent}

      {isDetailsVisible && (
        <div className="mt-4 border-t pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Median Rating
              </span>
              <span className="flex items-center gap-1.5 text-lg font-semibold">
                <Star className="h-4 w-4 text-amber-500" />
                {tournament.medianRating != null
                  ? tournament.medianRating.toLocaleString()
                  : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Median Score
              </span>
              <span className="flex items-center gap-1.5 text-lg font-semibold">
                <Trophy className="h-4 w-4 text-amber-500" />
                {tournament.medianScore != null
                  ? tournament.medianScore.toLocaleString()
                  : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Most Common Mod
              </span>
              <div className="flex h-7 items-center">
                <ModIconset mods={tournament.mostCommonMod} iconClassName="h-6" />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
