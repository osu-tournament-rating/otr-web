import Link from 'next/link';
import { MatchSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import { highlightMatch } from '@/lib/utils/search';

export default function TournamentSearchResult({
  input,
  data,
}: {
  input: string;
  data: MatchSearchResultDTO;
}) {
  return (
    <div className="flex flex-row rounded-xl bg-accent p-2">
      <div className="mx-0.5 flex flex-1 gap-2">
        <Link href={`/matches/${data.id}`}>
          <p className="text-lg">
            {highlightMatch(data.name ?? 'Unknown match', input)}
          </p>
        </Link>
      </div>
    </div>
  );
}
