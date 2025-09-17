'use client';
import Link from 'next/link';
import { useContext } from 'react';
import { Swords } from 'lucide-react';

import type { MatchSearchResult } from '@/lib/orpc/schema/search';
import { highlightMatch } from '@/lib/utils/search';
import { Card } from '../ui/card';
import { SearchDialogContext } from './SearchDialog';

export default function MatchSearchResult({
  data,
}: {
  data: MatchSearchResult;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  return (
    <Card className="border-none bg-popover p-3 transition-colors hover:bg-popover/80 sm:p-4">
      <Link
        href={`/matches/${data.id}`}
        onClick={closeDialog}
        className="flex flex-row items-center gap-2 overflow-hidden sm:gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex w-full min-w-66 flex-row items-center gap-4 md:min-w-96">
            <Swords className="h-4 w-4 flex-shrink-0 text-primary sm:h-5 sm:w-5" />
            <span>{highlightMatch(data.name ?? 'Unknown match', query)}</span>
          </div>

          <div className="flex w-full flex-col text-sm text-muted-foreground">
            <p>Played in</p>
            <p className="font-bold break-words">{data.tournamentName}</p>
          </div>
        </div>
      </Link>
    </Card>
  );
}
