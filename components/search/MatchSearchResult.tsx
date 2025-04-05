import Link from 'next/link';
import { MatchSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import { highlightMatch } from '@/lib/utils/search';
import { useContext } from 'react';
import { SearchDialogContext } from './SearchDialog';

interface MatchSearchResultProps {
  input: string;
  data: MatchSearchResultDTO;
}

export default function MatchSearchResult({ input, data }: MatchSearchResultProps) {
  const { setDialogOpen } = useContext(SearchDialogContext);

  return (
    <div className="flex items-center rounded-xl bg-accent p-3">
      <Link 
        href={`/matches/${data.id}`} 
        onClick={() => setDialogOpen(false)}
        className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <p className="text-lg font-medium">
          {highlightMatch(data.name ?? 'Unknown match', input)}
        </p>
      </Link>
    </div>
  );
}
