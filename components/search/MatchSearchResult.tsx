import Link from 'next/link';
import { MatchSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import { highlightMatch } from '@/lib/utils/search';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';
import { Card } from '../ui/card';
import { Swords } from 'lucide-react';

export default function MatchSearchResult({
  data,
}: {
  data: MatchSearchResultDTO;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  return (
    <Card className="border-none bg-popover p-3 transition-colors hover:bg-popover/80 sm:p-4">
      <Link
        href={`/matches/${data.id}`}
        onClick={closeDialog}
        className="flex items-center gap-2 overflow-hidden sm:gap-3"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted/50 sm:h-10 sm:w-10">
          <Swords className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
        </div>
        <p className="min-w-0 text-base font-medium sm:text-lg">
          {highlightMatch(data.name ?? 'Unknown match', query)}
        </p>
      </Link>
    </Card>
  );
}
