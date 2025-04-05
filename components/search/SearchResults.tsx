import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import PlayerSearchResult from './PlayerSearchResult';
import TournamentSearchResult from './TournamentSearchResult';
import MatchSearchResult from './MatchSearchResult';

interface SearchResultsProps {
  input: string;
  data: SearchResponseCollectionDTO | undefined;
}

export default function SearchResults({ input, data }: SearchResultsProps) {
  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6 rounded-xl">
      <SearchResultSection 
        title="Players" 
        emptyMessage="No player results."
      >
        {data.players.length > 0 ? (
          Object.entries(data.players)
            .sort((a, b) => (b[1].rating ?? 0) - (a[1].rating ?? 0))
            .slice(0, 5)
            .map(([key, entry]) => (
              <PlayerSearchResult
                key={`player-search-result-${key}`}
                input={input}
                data={entry}
              />
            ))
        ) : null}
      </SearchResultSection>

      <SearchResultSection 
        title="Tournaments" 
        emptyMessage="No tournament results."
      >
        {data.tournaments.length > 0 ? (
          Object.entries(data.tournaments)
            .slice(0, 5)
            .map(([key, entry]) => (
              <TournamentSearchResult
                key={`tournament-search-result-${key}`}
                input={input}
                data={entry}
              />
            ))
        ) : null}
      </SearchResultSection>

      <SearchResultSection 
        title="Matches" 
        emptyMessage="No match results."
      >
        {data.matches.length > 0 ? (
          Object.entries(data.matches)
            .slice(0, 5)
            .map(([key, entry]) => (
              <MatchSearchResult
                key={`match-search-result-${key}`}
                input={input}
                data={entry}
              />
            ))
        ) : null}
      </SearchResultSection>
    </div>
  );
}

interface SearchResultSectionProps {
  title: string;
  emptyMessage: string;
  children: React.ReactNode;
}

function SearchResultSection({ title, emptyMessage, children }: SearchResultSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="flex flex-col gap-2">
        {children || <p className="text-muted-foreground">{emptyMessage}</p>}
      </div>
    </section>
  );
}
