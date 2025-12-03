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
    <div className="flex w-full flex-row items-center gap-3 overflow-hidden">
      <Swords className="text-primary h-5 w-5 flex-shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">
          {highlightMatch(data.name ?? 'Unknown match', query)}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          in {data.tournamentName}
        </span>
      </div>
    </div>
  );
}
