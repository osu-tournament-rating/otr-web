import Link from 'next/link';
import { MatchSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import { highlightMatch } from '@/lib/utils/search';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';

export default function MatchSearchResult({
  data,
}: {
  data: MatchSearchResultDTO;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  return (
    <div className="flex items-center rounded-xl bg-accent p-3">
      <Link href={`/matches/${data.id}`} onClick={closeDialog}>
        <p className="text-lg font-medium">
          {highlightMatch(data.name ?? 'Unknown match', query)}
        </p>
      </Link>
    </div>
  );
}
