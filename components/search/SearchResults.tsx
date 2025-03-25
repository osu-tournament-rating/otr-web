import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import PlayerSearchResult from './PlayerSearchResult';
import TournamentSearchResult from './TournamentSearchResult';
import MatchSearchResult from './MatchSearchResult';

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
    <div className="space-y-5 rounded-xl">
      <div className="flex flex-col gap-3">
        <p className="text-xl font-bold">Players</p>
        <div className="flex flex-col gap-2">
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
      <div className="flex flex-col gap-3">
        <p className="text-xl font-bold">Tournaments</p>
        <div className="flex flex-col gap-2">
          {data.tournaments.length > 0 ? (
            Object.entries(data.tournaments)
              .slice(undefined, 5)
              .map(([key, entry]) => (
                <TournamentSearchResult
                  key={`tournament-search-result-${key}`}
                  input={input}
                  data={entry}
                />
              ))
          ) : (
            <p className="font-sans text-muted">No tournament results.</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xl font-bold">Matches</p>
        <div className="flex flex-col gap-2">
          {data.matches.length > 0 ? (
            Object.entries(data.matches)
              .slice(undefined, 5)
              .map(([key, entry]) => (
                <MatchSearchResult
                  key={`match-search-result-${key}`}
                  input={input}
                  data={entry}
                />
              ))
          ) : (
            <p className="font-sans text-muted">No tournament results.</p>
          )}
        </div>
      </div>
    </div>
  );
}
