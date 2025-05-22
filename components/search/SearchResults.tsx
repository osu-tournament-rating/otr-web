import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import { ScrollArea } from '../ui/scroll-area';
import { Swords, User, Trophy } from 'lucide-react';
import PlayerSearchResult from './PlayerSearchResult';
import TournamentSearchResult from './TournamentSearchResult';
import MatchSearchResult from './MatchSearchResult';

export default function SearchResults({
  data,
}: {
  data: SearchResponseCollectionDTO | undefined;
}) {
  if (!data) {
    return null;
  }

  return (
    <ScrollArea type="always" className="flex flex-1 overflow-y-auto pb-2">
      <div className="flex flex-1 flex-col gap-6 px-4">
        <section className="flex flex-col gap-2">
          <div className="text-primary flex flex-row items-center gap-2">
            <User />
            <h2 className="text-xl font-bold">Players</h2>
          </div>
          <div className="flex flex-col gap-2">
            {data.players.length ? (
              Object.entries(data.players)
                .sort((a, b) => (b[1].rating ?? 0) - (a[1].rating ?? 0))
                .slice(0, 5)
                .map(([key, entry]) => (
                  <PlayerSearchResult
                    key={`player-search-result-${key}`}
                    data={entry}
                  />
                ))
            ) : (
              <p className="text-muted-foreground">No player results...</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="text-primary flex flex-row items-center gap-2">
            <Trophy />
            <h2 className="text-xl font-bold">Tournaments</h2>
          </div>
          <div className="flex flex-col gap-2">
            {data.tournaments.length ? (
              Object.entries(data.tournaments)
                .slice(0, 5)
                .map(([key, entry]) => (
                  <TournamentSearchResult
                    key={`tournament-search-result-${key}`}
                    data={entry}
                  />
                ))
            ) : (
              <p className="text-muted-foreground">No tournament results...</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="text-primary flex flex-row items-center gap-2">
            <Swords />
            <h2 className="text-xl font-bold">Matches</h2>
          </div>
          <div className="flex flex-col gap-2">
            {data.matches.length ? (
              Object.entries(data.matches)
                .slice(0, 5)
                .map(([key, entry]) => (
                  <MatchSearchResult
                    key={`match-search-result-${key}`}
                    data={entry}
                  />
                ))
            ) : (
              <p className="text-muted-foreground">No match results...</p>
            )}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
