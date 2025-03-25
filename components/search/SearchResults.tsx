import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import PlayerSearchResult from './PlayerSearchResult';

export default function SearchResults({
  input,
  data,
}: {
  input: string;
  data: SearchResponseCollectionDTO | undefined;
}) {
  if (data === undefined) {
    return <></>;
  }

  return (
    <div className="space-y-2 rounded-xl">
      <p className="text-xl font-bold">Players</p>
      <div className="flex flex-col gap-3">
        {data.players.length > 0 ? (
          Object.entries(data.players)
            .sort((a, b) => (b[1].rating ?? 0) - (a[1].rating ?? 0))
            .slice(undefined, 5)
            .map(([key, entry]) => (
              <PlayerSearchResult
                key={`player-search-result-${key}`}
                input={input}
                data={entry}
              />
            ))
        ) : (
          <p className="font-sans text-muted">No player results.</p>
        )}
      </div>
    </div>
  );
}
