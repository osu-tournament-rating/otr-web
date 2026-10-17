'use client';

import { Swords } from 'lucide-react';

import type { MatchSearchResult } from '@/lib/orpc/schema/search';
import { highlightMatch } from '@/lib/utils/search';

interface MatchResultContentProps {
  data: MatchSearchResult;
  query: string;
}

export function MatchResultContent({ data, query }: MatchResultContentProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <Swords aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">
          {highlightMatch(data.name ?? 'Unknown match', query)}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          in {data.tournamentName}
        </span>
      </div>
    </div>
  );
}
