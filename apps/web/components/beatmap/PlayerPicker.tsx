'use client';

import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import type { PlayerLookupResult } from '@/lib/orpc/schema/player';
import { cn } from '@/lib/utils';

type Props = {
  value: PlayerLookupResult[];
  onChange: (players: PlayerLookupResult[]) => void;
  multiple?: boolean;
  /** Names the selection in accessible labels and the empty state. */
  label: string;
  placeholder?: string;
};

export default function PlayerPicker({
  value,
  onChange,
  multiple = false,
  label,
  placeholder = 'Search players or paste an osu! id',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerLookupResult[]>([]);
  const [loading, setLoading] = useState(false);

  const term = query.trim();

  useEffect(() => {
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await orpc.players.lookup({ query: term });
        if (!cancelled) setResults(response.players);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  const select = (player: PlayerLookupResult) => {
    if (value.some((selected) => selected.osuId === player.osuId)) {
      onChange(value.filter((selected) => selected.osuId !== player.osuId));
      return;
    }

    onChange(multiple ? [...value, player] : [player]);
    if (!multiple) setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Search ${label}`}
            className="w-full justify-between font-normal text-muted-foreground"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Search className="size-4 shrink-0" />
              <span className="truncate">{placeholder}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={placeholder}
            />
            <CommandList>
              {loading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              ) : (
                <CommandEmpty>
                  {term
                    ? 'No players found. Paste an osu! user id to pin one.'
                    : 'Type a username or osu! user id.'}
                </CommandEmpty>
              )}
              <CommandGroup>
                {!loading &&
                  results.map((player) => {
                    const selected = value.some(
                      (entry) => entry.osuId === player.osuId
                    );
                    return (
                      <CommandItem
                        key={player.osuId}
                        value={String(player.osuId)}
                        onSelect={() => select(player)}
                      >
                        <Check
                          className={cn(
                            'size-4',
                            selected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="flex-1 truncate">
                          {player.username}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {player.playerId === null
                            ? 'not yet fetched'
                            : player.osuId}
                        </span>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">No {label} selected.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.map((player) => (
            <Badge
              key={player.osuId}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="truncate">{player.username}</span>
              <button
                type="button"
                aria-label={`Remove ${player.username}`}
                onClick={() =>
                  onChange(
                    value.filter((entry) => entry.osuId !== player.osuId)
                  )
                }
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
