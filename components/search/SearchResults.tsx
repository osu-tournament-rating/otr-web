import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import { ScrollArea } from '../ui/scroll-area';
import { Swords, User, Trophy } from 'lucide-react';
import PlayerSearchResult from './PlayerSearchResult';
import TournamentSearchResult from './TournamentSearchResult';
import MatchSearchResult from './MatchSearchResult';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count: number;
}

function SectionHeader({ icon, title, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <span className="text-sm text-muted-foreground">({count})</span>
    </div>
  );
}

export default function SearchResults({
  data,
}: {
  data: SearchResponseCollectionDTO | undefined;
}) {
  if (!data) {
    return null;
  }

  const hasResults =
    data.players.length > 0 ||
    data.tournaments.length > 0 ||
    data.matches.length > 0;

  if (!hasResults) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No results found
          </p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search terms
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea type="always" className="flex flex-1 overflow-y-auto">
      <div className="flex flex-1 flex-col gap-6 p-4">
        {data.players.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              icon={<User className="h-5 w-5" />}
              title="Players"
              count={data.players.length}
            />
            <div className="space-y-2">
              {Object.entries(data.players)
                .sort((a, b) => (b[1].rating ?? 0) - (a[1].rating ?? 0))
                .slice(0, 5)
                .map(([key, entry]) => (
                  <PlayerSearchResult
                    key={`player-search-result-${key}`}
                    data={entry}
                  />
                ))}
            </div>
          </section>
        )}

        {data.tournaments.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              icon={<Trophy className="h-5 w-5" />}
              title="Tournaments"
              count={data.tournaments.length}
            />
            <div className="space-y-2">
              {Object.entries(data.tournaments)
                .slice(0, 5)
                .map(([key, entry]) => (
                  <TournamentSearchResult
                    key={`tournament-search-result-${key}`}
                    data={entry}
                  />
                ))}
            </div>
          </section>
        )}

        {data.matches.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              icon={<Swords className="h-5 w-5" />}
              title="Matches"
              count={data.matches.length}
            />
            <div className="space-y-2">
              {Object.entries(data.matches)
                .slice(0, 5)
                .map(([key, entry]) => (
                  <MatchSearchResult
                    key={`match-search-result-${key}`}
                    data={entry}
                  />
                ))}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  );
}
