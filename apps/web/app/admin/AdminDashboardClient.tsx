'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gavel, KeyRound, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ADMIN_BAN_REASONS,
  type AdminBanReason,
  type AdminPlayerSearchResult,
} from '@/lib/orpc/schema/user';
import type { ApiKeyMetadata } from '@/lib/orpc/schema/apiKey';
import { orpc } from '@/lib/orpc/orpc';
import { cn } from '@/lib/utils';

const formatRank = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '—';
  }

  return `#${value.toLocaleString()}`;
};

const formatRating = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '—';
  }

  return value.toFixed(2);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '—';
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return '—';
  }

  return timestamp.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getKeyPreview = (metadata: ApiKeyMetadata) => {
  const prefix = metadata.prefix?.trim() ?? '';
  const start = metadata.start?.trim() ?? '';
  const preview = `${prefix}${start}`.trim();

  if (!preview) {
    return '—';
  }

  return `${preview}…`;
};

const BAN_REASON_SUMMARY: Record<AdminBanReason, string> = {
  'API abuse': 'Rate-limit evasion or credential sharing.',
  'Submissions abuse': 'Fraudulent or automated submissions.',
  'Requests abuse': 'Spam or disruptive traffic.',
};

export default function AdminDashboardClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminPlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [didSearch, setDidSearch] = useState(false);

  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [pendingPlayer, setPendingPlayer] =
    useState<AdminPlayerSearchResult | null>(null);
  const [banReason, setBanReason] = useState<AdminBanReason | null>(null);
  const [banning, setBanning] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [apiKeyCache, setApiKeyCache] = useState<
    Record<number, ApiKeyMetadata[]>
  >({});
  const [apiKeyLoadingPlayerId, setApiKeyLoadingPlayerId] = useState<
    number | null
  >(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const bannedCount = useMemo(
    () => results.filter((entry) => entry.banned).length,
    [results]
  );

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerId === null) {
      return null;
    }

    return (
      results.find((player) => player.playerId === selectedPlayerId) ?? null
    );
  }, [results, selectedPlayerId]);

  const selectedPlayerApiKeys = useMemo(() => {
    if (!selectedPlayer) {
      return [];
    }

    return apiKeyCache[selectedPlayer.playerId] ?? [];
  }, [apiKeyCache, selectedPlayer]);

  const selectedPlayerApiKeyCount = selectedPlayerApiKeys.length;

  const isLoadingApiKeys = Boolean(
    selectedPlayer && apiKeyLoadingPlayerId === selectedPlayer.playerId
  );

  const apiKeyBadgeLabel = useMemo(() => {
    if (!selectedPlayer) {
      return 'Select a user';
    }

    if (isLoadingApiKeys) {
      return 'Loading…';
    }

    if (apiKeyError) {
      return 'Failed to load keys';
    }

    return `${selectedPlayerApiKeyCount} ${
      selectedPlayerApiKeyCount === 1 ? 'active key' : 'active keys'
    }`;
  }, [
    apiKeyError,
    isLoadingApiKeys,
    selectedPlayer,
    selectedPlayerApiKeyCount,
  ]);

  useEffect(() => {
    if (selectedPlayerId === null) {
      return;
    }

    const stillPresent = results.some(
      (player) => player.playerId === selectedPlayerId
    );

    if (!stillPresent) {
      setSelectedPlayerId(null);
      setApiKeyError(null);
      setApiKeyLoadingPlayerId(null);
    }
  }, [results, selectedPlayerId]);

  useEffect(() => {
    if (!selectedPlayer) {
      setApiKeyError(null);
      setApiKeyLoadingPlayerId(null);
      return;
    }

    if (apiKeyCache[selectedPlayer.playerId]) {
      setApiKeyError(null);
      return;
    }

    let active = true;
    setApiKeyLoadingPlayerId(selectedPlayer.playerId);
    setApiKeyError(null);

    orpc.users.admin
      .apiKeys({ playerId: selectedPlayer.playerId })
      .then((keys) => {
        if (!active) {
          return;
        }

        setApiKeyCache((previous) => ({
          ...previous,
          [selectedPlayer.playerId]: keys,
        }));
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error('[admin] failed to fetch API keys', error);

        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load API keys. Please try again.';
        setApiKeyError(message);
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setApiKeyLoadingPlayerId(null);
      });

    return () => {
      active = false;
    };
  }, [apiKeyCache, selectedPlayer]);

  const performSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();

    if (!trimmed) {
      toast.error('Enter a username to search.');
      return;
    }

    if (!/[a-zA-Z]/.test(trimmed)) {
      toast.error('Search by username, not numeric IDs.');
      return;
    }

    setSearching(true);
    setDidSearch(true);

    try {
      const response = await orpc.users.admin.search({ query: trimmed });
      setResults(response);

      if (response.length === 0) {
        toast.info('No authenticated users matched that username.');
      }
    } catch (error) {
      console.error('[admin] search failed', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await performSearch(query);
    },
    [performSearch, query]
  );

  const handleOpenBanDialog = useCallback((player: AdminPlayerSearchResult) => {
    setPendingPlayer(player);
    const existing = ADMIN_BAN_REASONS.find(
      (reason) => reason === player.banReason
    );
    setBanReason(existing ?? null);
    setBanDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setBanDialogOpen(open);
    if (!open) {
      setPendingPlayer(null);
      setBanReason(null);
      setBanning(false);
    }
  }, []);

  const handleConfirmBan = useCallback(async () => {
    if (!pendingPlayer || !banReason) {
      return;
    }

    setBanning(true);

    try {
      await orpc.users.admin.ban({
        playerId: pendingPlayer.playerId,
        reason: banReason,
      });

      setResults((previous) =>
        previous.map((entry) =>
          entry.playerId === pendingPlayer.playerId
            ? { ...entry, banned: true, banReason }
            : entry
        )
      );

      toast.success(
        `${pendingPlayer.username} banned for ${banReason.toLowerCase()}.`
      );
      handleDialogOpenChange(false);
    } catch (error) {
      console.error('[admin] ban failed', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to ban this account right now.';
      toast.error(message);
      setBanning(false);
    }
  }, [banReason, handleDialogOpenChange, pendingPlayer]);

  const handleSelectPlayer = useCallback((player: AdminPlayerSearchResult) => {
    setApiKeyError(null);
    setSelectedPlayerId((previous) =>
      previous === player.playerId ? null : player.playerId
    );
  }, []);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin controls</CardTitle>
            <CardDescription>
              Search authenticated players and enforce bans with documented
              reasons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Label
                  htmlFor="admin-player-search"
                  className="text-sm font-medium"
                >
                  Username
                </Label>
                <Input
                  id="admin-player-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="osu! username"
                  disabled={searching}
                  maxLength={32}
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={searching} className="sm:w-auto">
                {searching ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="mr-2 size-4" />
                    Search
                  </>
                )}
              </Button>
            </form>

            <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
              <span>
                Results:{' '}
                <span className="text-foreground font-medium">
                  {results.length}
                </span>
              </span>
              <span>
                Banned:{' '}
                <span className="text-foreground font-medium">
                  {bannedCount}
                </span>
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Rating
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Global rank
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searching ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="text-muted-foreground flex items-center gap-3 text-sm">
                          <Loader2 className="size-4 animate-spin" />
                          Searching players…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <p className="text-muted-foreground text-sm">
                          {didSearch
                            ? 'No authenticated players matched that username.'
                            : 'Search for a username to view accounts linked to auth.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((player) => {
                      const initials = player.username
                        .slice(0, 2)
                        .toUpperCase();
                      const isSelected = selectedPlayerId === player.playerId;
                      const banTooltipLabel = player.banned
                        ? 'Update ban reason'
                        : 'Ban user';
                      const keyTooltipLabel = isSelected
                        ? 'Hide API keys'
                        : 'View API keys';

                      return (
                        <TableRow
                          key={player.playerId}
                          className={cn(
                            'hover:bg-muted/60 cursor-pointer border-l-2 border-transparent',
                            isSelected && 'border-primary bg-primary/5'
                          )}
                          onClick={() => handleSelectPlayer(player)}
                          aria-selected={isSelected}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-10 border">
                                <AvatarImage
                                  src={`https://a.ppy.sh/${player.osuId}`}
                                  alt={`${player.username}'s avatar`}
                                />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {player.username}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  osu! ID {player.osuId}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatRating(player.rating)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatRank(player.globalRank)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={
                                  player.banned ? 'destructive' : 'secondary'
                                }
                                className={cn(
                                  player.banned && 'bg-destructive/20'
                                )}
                              >
                                {player.banned ? 'Banned' : 'Active'}
                              </Badge>
                              {player.banned && player.banReason && (
                                <span className="text-muted-foreground text-xs">
                                  Reason: {player.banReason}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      'hover:text-primary',
                                      isSelected
                                        ? 'text-primary'
                                        : 'text-muted-foreground'
                                    )}
                                    aria-label={keyTooltipLabel}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleSelectPlayer(player);
                                    }}
                                  >
                                    <KeyRound className="size-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  {keyTooltipLabel}
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      'hover:text-destructive',
                                      player.banned
                                        ? 'text-destructive'
                                        : 'text-muted-foreground'
                                    )}
                                    aria-label={banTooltipLabel}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleOpenBanDialog(player);
                                    }}
                                  >
                                    <Gavel className="size-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  {banTooltipLabel}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {selectedPlayer && (
              <div className="border-border bg-muted/10 space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="text-primary size-5" />
                    <div className="flex flex-col">
                      <span className="text-foreground font-semibold">
                        {selectedPlayer.username}&apos;s API keys
                      </span>
                      <span className="text-muted-foreground text-xs">
                        Active keys currently enabled for this user.
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-normal">
                    {apiKeyBadgeLabel}
                  </Badge>
                </div>

                <div className="overflow-hidden rounded-md border">
                  {isLoadingApiKeys ? (
                    <div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
                      <Loader2 className="size-4 animate-spin" />
                      Loading API keys…
                    </div>
                  ) : apiKeyError ? (
                    <div className="text-destructive p-4 text-sm">
                      {apiKeyError}
                    </div>
                  ) : selectedPlayerApiKeyCount > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Key</TableHead>
                          <TableHead>Last used</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Requests</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPlayerApiKeys.map((keyMetadata) => (
                          <TableRow key={keyMetadata.id}>
                            <TableCell className="font-medium">
                              {keyMetadata.name &&
                              keyMetadata.name.trim().length > 0
                                ? keyMetadata.name.trim()
                                : 'API key'}
                            </TableCell>
                            <TableCell>{getKeyPreview(keyMetadata)}</TableCell>
                            <TableCell>
                              {formatDateTime(keyMetadata.lastRequest)}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(keyMetadata.createdAt)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {keyMetadata.requestCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-muted-foreground p-4 text-sm">
                      No active API keys found for this user.
                    </div>
                  )}
                </div>
              </div>
            )}

            {results.some((player) => player.banned && player.banReason) && (
              <div className="border-muted-foreground/40 text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
                <p className="text-foreground font-medium">
                  Recorded ban reasons
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {ADMIN_BAN_REASONS.map((reason) => (
                    <li key={reason}>
                      <span className="text-foreground font-medium">
                        {reason}:
                      </span>{' '}
                      {BAN_REASON_SUMMARY[reason]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={banDialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm ban</AlertDialogTitle>
            <AlertDialogDescription>
              Select a reason to ban{' '}
              <span className="text-foreground font-semibold">
                {pendingPlayer?.username ?? 'this player'}
              </span>
              . Their API keys and sessions will be disabled immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Label className="text-foreground text-sm font-medium">
              Ban reason
            </Label>
            <RadioGroup
              value={banReason ?? ''}
              onValueChange={(value) =>
                setBanReason(
                  ADMIN_BAN_REASONS.find((reason) => reason === value) ?? null
                )
              }
              className="gap-3"
            >
              {ADMIN_BAN_REASONS.map((reason) => (
                <label
                  key={reason}
                  htmlFor={`ban-reason-${reason}`}
                  className={cn(
                    'border-border bg-muted/20 hover:border-primary/60 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                    banReason === reason && 'border-primary bg-primary/10'
                  )}
                >
                  <RadioGroupItem value={reason} id={`ban-reason-${reason}`} />
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">{reason}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={banning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBan}
              disabled={!banReason || banning}
            >
              {banning ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Banning…
                </>
              ) : (
                'Confirm ban'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
