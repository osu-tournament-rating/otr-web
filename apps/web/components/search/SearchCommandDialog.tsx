'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@uidotdev/usehooks';
import { useHotkeys } from 'react-hotkeys-hook';
import { Search, LoaderCircle, User, Trophy, Swords, Music } from 'lucide-react';

import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/lib/hooks/useSearch';
import { useSession } from '@/lib/hooks/useSession';
import {
  PlayerResultContent,
  TournamentResultContent,
  MatchResultContent,
  BeatmapResultContent,
} from './results';

function GroupHeading({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}

export default function SearchCommandDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data, isLoading } = useSearch(debouncedQuery);
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      setOpen((prev) => !prev);
    },
    { enableOnFormTags: true }
  );

  const handleSelect = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router]
  );

  if (!session) return null;

  const hasResults =
    data &&
    (data.players.length > 0 ||
      data.tournaments.length > 0 ||
      data.matches.length > 0 ||
      data.beatmaps.length > 0);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="cursor-pointer"
      >
        <Search className="size-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search players, tournaments, matches, and beatmaps"
      >
        <Command shouldFilter={false} loop>
          <div className="relative">
            <CommandInput
              placeholder="Search players, tournaments, matches..."
              value={query}
              onValueChange={(value) => setQuery(value.trimStart())}
            />
            {isLoading && (
              <LoaderCircle className="text-muted-foreground absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
            )}
          </div>

          <CommandList className="max-h-[400px]">
            {!debouncedQuery && (
              <div className="flex flex-col items-center justify-center py-8">
                <Search className="text-muted-foreground/30 h-10 w-10" />
                <p className="text-muted-foreground mt-3 text-sm">
                  Start typing to search
                </p>
              </div>
            )}

            {debouncedQuery && !isLoading && !hasResults && (
              <CommandEmpty>
                <div className="text-center">
                  <p className="text-muted-foreground">No results found</p>
                  <p className="text-muted-foreground/70 text-xs">
                    Try adjusting your search terms
                  </p>
                </div>
              </CommandEmpty>
            )}

            {hasResults && (
              <>
                {data.players.length > 0 && (
                  <CommandGroup
                    heading={<GroupHeading icon={User} label="Players" />}
                  >
                    {data.players.map((player) => (
                      <CommandItem
                        key={`player-${player.id}`}
                        value={`player-${player.id}`}
                        onSelect={() =>
                          handleSelect(
                            player.ruleset != null
                              ? `/players/${player.id}?ruleset=${player.ruleset}`
                              : `/players/${player.id}`
                          )
                        }
                        className="h-auto py-3"
                      >
                        <PlayerResultContent
                          data={player}
                          query={debouncedQuery}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {data.tournaments.length > 0 && (
                  <CommandGroup
                    heading={
                      <GroupHeading icon={Trophy} label="Tournaments" />
                    }
                  >
                    {data.tournaments.map((tournament) => (
                      <CommandItem
                        key={`tournament-${tournament.id}`}
                        value={`tournament-${tournament.id}`}
                        onSelect={() =>
                          handleSelect(`/tournaments/${tournament.id}`)
                        }
                        className="h-auto py-3"
                      >
                        <TournamentResultContent
                          data={tournament}
                          query={debouncedQuery}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {data.matches.length > 0 && (
                  <CommandGroup
                    heading={<GroupHeading icon={Swords} label="Matches" />}
                  >
                    {data.matches.map((match) => (
                      <CommandItem
                        key={`match-${match.id}`}
                        value={`match-${match.id}`}
                        onSelect={() => handleSelect(`/matches/${match.id}`)}
                        className="h-auto py-3"
                      >
                        <MatchResultContent
                          data={match}
                          query={debouncedQuery}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {data.beatmaps.length > 0 && (
                  <CommandGroup
                    heading={<GroupHeading icon={Music} label="Beatmaps" />}
                  >
                    {data.beatmaps.map((beatmap) => (
                      <CommandItem
                        key={`beatmap-${beatmap.osuId}`}
                        value={`beatmap-${beatmap.osuId}`}
                        onSelect={() =>
                          handleSelect(`/beatmaps/${beatmap.osuId}`)
                        }
                        className="h-auto py-3"
                      >
                        <BeatmapResultContent
                          data={beatmap}
                          query={debouncedQuery}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
