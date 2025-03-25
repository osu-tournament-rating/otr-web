import { PlayerSearchResultDTO } from '@osu-tournament-rating/otr-api-client';
import PlayerSearchResult from './SearchResult';

export default function PlayerSearchResultSection({
  data,
}: {
  data: PlayerSearchResultDTO[] | undefined;
}) {
  if (data === undefined) {
    return <></>;
  }

  return (
    <div className="space-y-2 rounded-xl">
      {data.length > 0 && <p className="text-xl font-bold">Players</p>}
      <div className="flex flex-col gap-3">
        {data.length > 0 &&
          Object.entries(data).map(([key, entry]) => (
            <PlayerSearchResult
              key={`player-search-result-${key}`}
              data={entry}
            />
          ))}
      </div>
    </div>
  );
}
