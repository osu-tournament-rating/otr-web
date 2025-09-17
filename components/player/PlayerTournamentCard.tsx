import { RulesetEnumHelper } from '@/lib/enums';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';
import {
  TournamentCompactDTO,
  RatingAdjustmentDTO,
} from '@osu-tournament-rating/otr-api-client';
import Link from 'next/link';
import VerificationBadge from '../badges/VerificationBadge';
import { Card } from '../ui/card';
import RulesetIcon from '../icons/RulesetIcon';
import { Users, Target, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import PlayerTournamentMatchTable from './PlayerTournamentMatchTable';
import { cn } from '@/lib/utils';

function formatRankRangeDisplay(rankRange: number): string {
  if (rankRange === 1) return 'Open';
  return formatRankRange(rankRange);
}

interface PlayerTournamentCardProps {
  tournament: TournamentCompactDTO;
  adjustments: RatingAdjustmentDTO[];
}

export default function PlayerTournamentCard({
  tournament,
  adjustments,
}: PlayerTournamentCardProps) {
  const [isMatchesVisible, setIsMatchesVisible] = useState(false);

  const startDate = tournament.startTime
    ? new Date(tournament.startTime)
    : null;
  const endDate = tournament.endTime ? new Date(tournament.endTime) : null;

  const cardContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <VerificationBadge
          verificationStatus={tournament.verificationStatus}
          rejectionReason={tournament.rejectionReason}
          entityType="tournament"
          displayText={true}
        />
        <div className="flex w-full sm:w-auto">
          <span className="font-mono text-sm text-muted-foreground">
            {tournament.abbreviation}
          </span>
        </div>
      </div>

      <Link href={`/tournaments/${tournament.id}`} className="hover:underline">
        <h2 className="text-lg leading-tight font-semibold sm:text-xl md:text-2xl">
          {tournament.name}
        </h2>
      </Link>

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-2 text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-1.5">
            <RulesetIcon
              ruleset={tournament.ruleset}
              width={16}
              height={16}
              className="flex-shrink-0 fill-current"
            />
            <span className="truncate">
              {RulesetEnumHelper.getMetadata(tournament.ruleset).text}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {tournament.lobbySize}v{tournament.lobbySize}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
            </span>
          </div>

          {startDate && endDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">
                {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
              </span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className={cn(
            '-my-1 ml-auto h-8 gap-2 px-3 text-sm sm:ml-0',
            'hover:bg-accent hover:text-accent-foreground',
            'border border-input',
            isMatchesVisible && 'bg-accent text-accent-foreground'
          )}
          onClick={(e) => {
            e.preventDefault();
            setIsMatchesVisible(!isMatchesVisible);
          }}
        >
          {isMatchesVisible ? 'Hide Matches' : 'Show Matches'}
          {isMatchesVisible ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="p-4 font-sans sm:p-6">
      {cardContent}

      {isMatchesVisible && (
        <div>
          {(() => {
            const filteredAdjustments = adjustments.filter((adj) => {
              // Check if match exists and its name starts with the tournament abbreviation
              if (!adj.match?.name.startsWith(tournament.abbreviation)) {
                return false;
              }

              // Check if adjustment is within tournament dates
              if (
                tournament.startTime &&
                adj.timestamp < tournament.startTime
              ) {
                return false;
              }
              if (tournament.endTime && adj.timestamp > tournament.endTime) {
                return false;
              }

              return true;
            });

            return filteredAdjustments.length > 0 ? (
              <PlayerTournamentMatchTable adjustments={filteredAdjustments} />
            ) : (
              <>
                <div className="border-t" />
                <div className="flex items-center justify-center p-4">
                  <span className="text-sm text-muted-foreground">
                    No matches found
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </Card>
  );
}
