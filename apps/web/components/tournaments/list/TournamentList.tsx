import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import TournamentListRow, {
  TOURNAMENT_ROW_COLUMNS,
  TOURNAMENT_ROW_NAME_CELL,
} from '@/components/tournaments/TournamentListRow';
import { Skeleton } from '@/components/ui/skeleton';
import { type TournamentListItem } from '@/lib/orpc/schema/tournament';
import { cn } from '@/lib/utils';

/** The column labels over the rows from `lg`, pinned under the site header. */
function TournamentListColumns() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'hidden h-8 items-center border-b bg-muted px-4 text-xs font-medium text-muted-foreground lg:sticky lg:top-(--header-height-px) lg:z-10 lg:grid',
        TOURNAMENT_ROW_COLUMNS
      )}
    >
      <span>Tournament</span>
      <span>Format</span>
      {/* Ends where the dates do, before the rows' chevron (16px + 12px). */}
      <span className="pr-7 text-right">Dates</span>
    </div>
  );
}

/** One page of the tournament list: rows that each open their tournament. */
export default function TournamentList({
  tournaments,
}: {
  tournaments: TournamentListItem[];
}) {
  return (
    <>
      <TournamentListColumns />
      <RowList aria-label="Tournament submissions">
        {tournaments.map((tournament) => (
          <TournamentListRow key={tournament.id} tournament={tournament} />
        ))}
      </RowList>
    </>
  );
}

/** The rows while the list loads, the same height as loaded rows. */
export function TournamentListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      <TournamentListColumns />
      <RowList aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <RowListItem key={index}>
            <div className={cn('grid gap-2', TOURNAMENT_ROW_COLUMNS)}>
              <div
                className={cn(
                  'flex h-6 items-center gap-2',
                  TOURNAMENT_ROW_NAME_CELL
                )}
              >
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <div className="flex h-5 items-center gap-4 pl-6 lg:pl-0">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex h-5 items-center pl-6 md:justify-end md:pl-0">
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </RowListItem>
        ))}
      </RowList>
    </>
  );
}
