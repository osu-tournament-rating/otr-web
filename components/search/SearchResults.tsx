import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';
import { ScrollArea } from '../ui/scroll-area';
import { Swords, User, Trophy } from 'lucide-react';
import PlayerSearchResult from './PlayerSearchResult';
import TournamentSearchResult from './TournamentSearchResult';
import MatchSearchResult from './MatchSearchResult';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 pb-2 sm:gap-3">
      <div className="flex items-center gap-1.5 text-primary sm:gap-2">
        {icon}
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
      </div>
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
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="text-center">
          <p className="text-base font-medium text-muted-foreground sm:text-lg">
            No results found
          </p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Try adjusting your search terms
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea type="always" className="flex flex-1 overflow-y-auto">
      <div className="flex flex-1 flex-col gap-4 p-3 sm:gap-6 sm:p-4">
        {data.players.length > 0 && (
          <section className="space-y-2 sm:space-y-3">
            <SectionHeader
              icon={<User className="h-4 w-4 sm:h-5 sm:w-5" />}
              title="Players"
            />
            <div className="space-y-1.5 sm:space-y-2">
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
          <section className="space-y-2 sm:space-y-3">
            <SectionHeader
              icon={<Trophy className="h-4 w-4 sm:h-5 sm:w-5" />}
              title="Tournaments"
            />
            <div className="space-y-1.5 sm:space-y-2">
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
          <section className="space-y-2 sm:space-y-3">
            <SectionHeader
              icon={<Swords className="h-4 w-4 sm:h-5 sm:w-5" />}
              title="Matches"
            />
            <div className="space-y-1.5 sm:space-y-2">
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
