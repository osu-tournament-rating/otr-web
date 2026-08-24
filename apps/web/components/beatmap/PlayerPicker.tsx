'use client';

import { Check, Loader2, X } from 'lucide-react';
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
import { orpc } from '@/lib/orpc/orpc';
import type { PlayerLookupResult } from '@/lib/orpc/schema/player';
import { cn } from '@/lib/utils';

type Props = {
  value: PlayerLookupResult[];
  onChange: (players: PlayerLookupResult[]) => void;
  multiple?: boolean;
  placeholder?: string;
};

export default function PlayerPicker({
  value,
  onChange,
  multiple = false,
  placeholder = 'Search players or paste an osu! id',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerLookupResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
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
  }, [query]);

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
            className="w-full justify-start font-normal"
          >
            {value.length === 0
              ? placeholder
              : multiple
                ? `${value.length} selected`
                : value[0].username}
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
              {loading && (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching
                </div>
              )}
              {!loading && (
                <CommandEmpty>
                  No players found. Enter an osu! user id to pin one.
                </CommandEmpty>
              )}
              <CommandGroup>
                {results.map((player) => {
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
                      <span className="flex-1">{player.username}</span>
                      <span className="text-xs text-muted-foreground">
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

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((player) => (
            <Badge key={player.osuId} variant="secondary" className="gap-1">
              {player.username}
              <button
                type="button"
                aria-label={`Remove ${player.username}`}
                onClick={() =>
                  onChange(
                    value.filter((entry) => entry.osuId !== player.osuId)
                  )
                }
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
