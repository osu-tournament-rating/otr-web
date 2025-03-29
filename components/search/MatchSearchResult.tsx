import Link from 'next/link';
import { MatchSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import { highlightMatch } from '@/lib/utils/search';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';

export default function TournamentSearchResult({
  input,
  data,
}: {
  input: string;
  data: MatchSearchResultDTO;
}) {
  const { setDialogOpen } = useContext(SearchDialogContext);

  return (
    <div className="mx-0.5 flex flex-1 flex-row gap-2 rounded-xl bg-accent p-2">
      <Link href={`/matches/${data.id}`} onClick={() => setDialogOpen(false)}>
        <p className="text-lg">
          {highlightMatch(data.name ?? 'Unknown match', input)}
        </p>
      </Link>
    </div>
  );
}
