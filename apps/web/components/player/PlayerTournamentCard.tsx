import { RulesetEnumHelper } from '@/lib/enum-helpers';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';
import Link from 'next/link';
import VerificationBadge from '../badges/VerificationBadge';
import { LazerBadge } from '../badges/LazerBadge';
import { Card } from '../ui/card';
import RulesetIcon from '../icons/RulesetIcon';
import { Users, Target, Calendar, Eye, EyeOff, Swords } from 'lucide-react';
import RatingDelta from '../rating/RatingDelta';
import { Button } from '../ui/button';
import { useState } from 'react';
import PlayerTournamentMatchTable from './PlayerTournamentMatchTable';
import { cn } from '@/lib/utils';
import { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';
import { PlayerTournamentListItem } from '@/lib/orpc/schema/tournament';

function formatRankRangeDisplay(rankRange: number): string {
  if (rankRange === 1) return 'Open';
  return formatRankRange(rankRange);
}

interface PlayerTournamentCardProps {
  tournament: PlayerTournamentListItem;
  adjustments: PlayerRatingAdjustment[];
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

  const filteredAdjustments = adjustments.filter((adj) => {
    return adj.match?.tournamentId == tournament.id;
  });

  const totalRatingDelta = filteredAdjustments.reduce(
    (sum, adj) => sum + adj.ratingDelta,
    0
  );

  const cardContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Link href={`/tournaments/${tournament.id}`}>
          <h2 className="text-lg font-semibold leading-tight sm:text-xl md:text-2xl">
            {tournament.name}
          </h2>
        </Link>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="text-muted-foreground font-mono text-sm">
            {tournament.abbreviation}
          </span>
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <Swords className="h-4 w-4" />
            <span>
              {tournament.matchesWon}-{tournament.matchesLost}
            </span>
          </div>
          <RatingDelta delta={totalRatingDelta} />
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="text-muted-foreground flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <VerificationBadge
            verificationStatus={tournament.verificationStatus}
            rejectionReason={tournament.rejectionReason}
            entityType="tournament"
            displayText={true}
            verifierUsername={tournament.verifiedByUsername ?? undefined}
          />

          <LazerBadge isLazer={tournament.isLazer} />

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
            'border-input border',
            isMatchesVisible && 'bg-accent text-accent-foreground'
          )}
          onClick={(e) => {
            e.preventDefault();
            setIsMatchesVisible(!isMatchesVisible);
          }}
        >
          {isMatchesVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Matches
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
            return filteredAdjustments.length > 0 ? (
              <PlayerTournamentMatchTable adjustments={filteredAdjustments} />
            ) : (
              <>
                <div className="border-t" />
                <div className="flex items-center justify-center p-4">
                  <span className="text-muted-foreground text-sm">
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
