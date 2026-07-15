import { CalendarDays, ChevronRight, Target, Users } from 'lucide-react';

import VerificationBadge from '@/components/badges/VerificationBadge';
import { LazerBadge } from '@/components/badges/LazerBadge';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
import { type TournamentListItem } from '@/lib/orpc/schema/tournament';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';

function formatRankRangeDisplay(rankRange: number): string {
  return rankRange === 1 ? 'Open rank' : formatRankRange(rankRange);
}

function formatTournamentDates(
  startTime: Date | string | null,
  endTime: Date | string | null
): string {
  const startDate = startTime ? formatUTCDate(new Date(startTime)) : null;
  const endDate = endTime ? formatUTCDate(new Date(endTime)) : null;

  if (startDate && endDate) {
    return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
  }

  return startDate ?? endDate ?? 'Dates unavailable';
}

export default function TournamentListRow({
  tournament,
}: {
  tournament: TournamentListItem;
}) {
  const dateRange = formatTournamentDates(
    tournament.startTime,
    tournament.endTime
  );

  return (
    <div
      data-testid="tournament-card"
      className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.7fr)_minmax(230px,0.6fr)] lg:items-center lg:gap-5"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="min-w-0 text-base leading-snug font-semibold text-foreground transition-colors group-hover:text-primary sm:text-lg">
            {tournament.name}
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {tournament.abbreviation}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <VerificationBadge
            verificationStatus={tournament.verificationStatus}
            rejectionReason={tournament.rejectionReason}
            entityType="tournament"
            displayText
            verifierUsername={tournament.verifiedByUsername ?? undefined}
          />
          <LazerBadge isLazer={tournament.isLazer} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <RulesetIcon
            ruleset={tournament.ruleset}
            className="size-4 shrink-0 fill-current"
            aria-hidden="true"
          />
          {RulesetEnumHelper.getMetadata(tournament.ruleset).text}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          {tournament.lobbySize}v{tournament.lobbySize}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Target className="size-4 shrink-0" aria-hidden="true" />
          {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3 text-sm text-muted-foreground lg:justify-end">
        <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap lg:text-right">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <span>{dateRange}</span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
