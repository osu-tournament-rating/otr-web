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
    <Card className="border-none bg-popover p-4 transition-colors hover:bg-popover/80">
      <Link
        href={`/matches/${data.id}`}
        onClick={closeDialog}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
          <Swords className="h-5 w-5 text-primary" />
        </div>
        <p className="text-lg font-medium">
          {highlightMatch(data.name ?? 'Unknown match', query)}
        </p>
      </Link>
    </Card>
  );
}
