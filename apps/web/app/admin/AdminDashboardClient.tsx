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
import { OsuAvatar } from '@/components/ui/osu-avatar';
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
import type { AdminMassEnqueueResponse } from '@/lib/orpc/schema/admin';
import { orpc } from '@/lib/orpc/orpc';
import { cn } from '@/lib/utils';
import { getApiKeyPreview } from '@/lib/utils/apiKey';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

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

const formatPluralMessage = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

export default function AdminDashboardClient() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AdminPlayerSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [didSearch, setDidSearch] = useState(false);

  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [pendingPlayer, setPendingPlayer] =
    useState<AdminPlayerSearchResult | null>(null);
  const [banReason, setBanReason] = useState<AdminBanReason | null>(null);
  const [banning, setBanning] = useState(false);

  const [showKeys, setShowKeys] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyMetadata[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const [beatmapIdsInput, setBeatmapIdsInput] = useState('');
  const [matchIdsInput, setMatchIdsInput] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [massEnqueueing, setMassEnqueueing] = useState(false);
  const [massEnqueueCompletionData, setMassEnqueueCompletionData] =
    useState<AdminMassEnqueueResponse | null>(null);

  const [progressPhase, setProgressPhase] = useState<
    'beatmaps' | 'matches' | null
  >(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    setShowKeys(false);
    setApiKeys([]);
    setApiKeysLoading(false);
    setApiKeyError(null);
  }, [result?.playerId]);

  useEffect(() => {
    if (!result || !showKeys) {
      return;
    }

    let active = true;
    setApiKeysLoading(true);
    setApiKeyError(null);

    orpc.users.admin
      .apiKeys({ playerId: result.playerId })
      .then((keys) => {
        if (!active) return;
        setApiKeys(keys);
      })
      .catch((error) => {
        if (!active) return;
        console.error('[admin] failed to fetch API keys', error);
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load API keys. Please try again.';
        setApiKeyError(message);
      })
      .finally(() => {
        if (!active) return;
        setApiKeysLoading(false);
      });

    return () => {
      active = false;
    };
  }, [result, showKeys]);

  const performSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();

    if (!trimmed) {
      toast.error('Enter a username to search.');
      return;
    }

    setSearching(true);
    setDidSearch(true);

    try {
      const response = await orpc.users.admin.search({ query: trimmed });
      const top = response[0] ?? null;
      setResult(top);

      if (!top) {
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

      setResult((previous) =>
        previous && previous.playerId === pendingPlayer.playerId
          ? { ...previous, banned: true, banReason }
          : previous
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

  const parseIds = useCallback((input: string): number[] => {
    if (!input.trim()) {
      return [];
    }

    const sanitized = input.replace(/[^\d\s,\n]+/g, ' ');

    const ids = sanitized
      .split(/[\s,\n]+/)
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed || trimmed.length > 10) return null;
        const num = Number.parseInt(trimmed, 10);
        return Number.isSafeInteger(num) && num > 0 ? num : null;
      })
      .filter((id): id is number => id !== null);

    return Array.from(new Set(ids));
  }, []);

  const parsedBeatmapIds = useMemo(
    () => parseIds(beatmapIdsInput),
    [beatmapIdsInput, parseIds]
  );
  const parsedMatchIds = useMemo(
    () => parseIds(matchIdsInput),
    [matchIdsInput, parseIds]
  );

  const handleMassEnqueue = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const allBeatmapIds = parsedBeatmapIds;
      const allMatchIds = parsedMatchIds;

      const beatmapIds = allBeatmapIds.filter(
        (id) => id >= 1 && id <= 20_000_000
      );
      const matchIds = allMatchIds.filter((id) => id >= 1);

      const filteredBeatmaps = allBeatmapIds.length - beatmapIds.length;
      const filteredMatches = allMatchIds.length - matchIds.length;

      if (filteredBeatmaps > 0) {
        toast.warning(
          `Filtered out ${formatPluralMessage(filteredBeatmaps, 'invalid beatmap ID', 'invalid beatmap IDs')} (must be between 1 and 20,000,000).`
        );
      }

      if (filteredMatches > 0) {
        toast.warning(
          `Filtered out ${formatPluralMessage(filteredMatches, 'invalid match ID', 'invalid match IDs')} (must be positive).`
        );
      }

      if (beatmapIds.length === 0 && matchIds.length === 0) {
        toast.error('No valid IDs to enqueue after filtering.');
        return;
      }

      setMassEnqueueing(true);
      setMassEnqueueCompletionData(null);
      setShowProgress(false);
      setProgressPhase(null);
      setProgressPercent(0);
      setCurrentBatch(0);
      setTotalBatches(0);
      setProgressMessage('');

      try {
        const iterator = await orpc.admin.massEnqueue({
          beatmapIds,
          matchIds,
          priority,
        });

        for await (const event of iterator) {
          if (event.type === 'progress') {
            setShowProgress(true);
            setProgressPhase(event.phase);
            setCurrentBatch(event.currentBatch);
            setTotalBatches(event.totalBatches);
            setProgressMessage(event.message);

            const percent = (event.itemsProcessed / event.totalItems) * 100;
            setProgressPercent(Math.min(percent, 100));
          } else if (event.type === 'complete') {
            setMassEnqueueCompletionData({
              beatmapsUpdated: event.beatmapsUpdated,
              beatmapsSkipped: event.beatmapsSkipped,
              matchesUpdated: event.matchesUpdated,
              matchesSkipped: event.matchesSkipped,
              warnings: event.warnings,
            });

            const totalUpdated = event.beatmapsUpdated + event.matchesUpdated;
            const totalSkipped = event.beatmapsSkipped + event.matchesSkipped;

            if (totalUpdated > 0) {
              toast.success(
                `Successfully enqueued ${formatPluralMessage(totalUpdated, 'item', 'items')} for refetch.`
              );
            }

            if (totalSkipped > 0) {
              toast.info(
                `Skipped ${formatPluralMessage(totalSkipped, 'item', 'items')} (not found or already marked as 404).`
              );
            }

            if (event.warnings && event.warnings.length > 0) {
              event.warnings.forEach((warning) => toast.warning(warning));
            }
          }
        }
      } catch (error) {
        console.error('[admin] mass enqueue failed', error);

        let message = 'Mass enqueue failed. Please try again.';

        if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = String(error.message);

          if (
            errorMessage.toLowerCase().includes('validation') ||
            errorMessage.toLowerCase().includes('invalid')
          ) {
            if (errorMessage.includes('beatmap')) {
              message = `Beatmap validation error: ${errorMessage}`;
            } else if (errorMessage.includes('match')) {
              message = `Match validation error: ${errorMessage}`;
            } else {
              message = errorMessage;
            }
          } else if (errorMessage.length > 0 && errorMessage !== 'Error') {
            message = errorMessage;
          }
        }

        toast.error(message);
      } finally {
        setMassEnqueueing(false);
        setShowProgress(false);
      }
    },
    [parsedBeatmapIds, parsedMatchIds, priority]
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User lookup</CardTitle>
            <CardDescription>
              Search for users by username to review ban status and API access.
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

            {searching ? (
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Searching…
              </div>
            ) : didSearch && !result ? (
              <p className="text-muted-foreground text-sm">
                No authenticated players matched that username.
              </p>
            ) : result ? (
              <div className="overflow-hidden rounded-lg border">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <OsuAvatar
                      osuId={result.osuId}
                      username={result.username}
                      size={48}
                      className="border"
                      fallback={
                        <span className="text-sm font-medium">
                          {result.username.slice(0, 2).toUpperCase()}
                        </span>
                      }
                    />
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium">
                        {result.username}
                      </span>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <span>osu! ID {result.osuId}</span>
                        <span>•</span>
                        <Badge
                          variant={result.banned ? 'destructive' : 'secondary'}
                          className={cn(result.banned && 'bg-destructive/20')}
                        >
                          {result.banned ? 'Banned' : 'Active'}
                        </Badge>
                        {result.banned && result.banReason && (
                          <span className="text-muted-foreground">
                            Reason: {result.banReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'hover:text-primary',
                            showKeys ? 'text-primary' : 'text-muted-foreground'
                          )}
                          aria-label={
                            showKeys ? 'Hide API keys' : 'View API keys'
                          }
                          onClick={() => setShowKeys((v) => !v)}
                        >
                          <KeyRound className="size-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {showKeys ? 'Hide API keys' : 'View API keys'}
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
                            result.banned
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          )}
                          aria-label={
                            result.banned ? 'Update ban reason' : 'Ban user'
                          }
                          onClick={() => handleOpenBanDialog(result)}
                        >
                          <Gavel className="size-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {result.banned ? 'Update ban reason' : 'Ban user'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {showKeys && (
                  <div className="border-t">
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-2">
                        <KeyRound className="text-primary size-5" />
                        <span className="text-foreground font-semibold">
                          API keys
                        </span>
                      </div>
                      <Badge variant="outline" className="font-normal">
                        {apiKeysLoading
                          ? 'Loading…'
                          : apiKeyError
                            ? 'Failed to load keys'
                            : `${apiKeys.length} ${apiKeys.length === 1 ? 'active key' : 'active keys'}`}
                      </Badge>
                    </div>

                    <div className="mx-4 mb-4 overflow-hidden rounded-md border">
                      {apiKeysLoading ? (
                        <div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
                          <Loader2 className="size-4 animate-spin" />
                          Loading API keys…
                        </div>
                      ) : apiKeyError ? (
                        <div className="text-destructive p-4 text-sm">
                          {apiKeyError}
                        </div>
                      ) : apiKeys.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Key</TableHead>
                              <TableHead>Last used</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead className="text-right">
                                Requests
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {apiKeys.map((keyMetadata) => (
                              <TableRow key={keyMetadata.id}>
                                <TableCell className="font-medium">
                                  {keyMetadata.name &&
                                  keyMetadata.name.trim().length > 0
                                    ? keyMetadata.name.trim()
                                    : 'API key'}
                                </TableCell>
                                <TableCell>
                                  {getApiKeyPreview(keyMetadata)}
                                </TableCell>
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
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mass enqueue</CardTitle>
            <CardDescription>
              Mass enqueue beatmaps and matches for refetch. Enter IDs separated
              by commas, spaces, or newlines. Only IDs that exist in the
              database will be enqueued.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMassEnqueue} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="beatmap-ids" className="text-sm font-medium">
                    Beatmap IDs
                  </Label>
                  <Textarea
                    id="beatmap-ids"
                    value={beatmapIdsInput}
                    onChange={(event) => setBeatmapIdsInput(event.target.value)}
                    placeholder="1234567, 2345678, 3456789..."
                    disabled={massEnqueueing}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  {beatmapIdsInput.trim() && (
                    <p className="text-muted-foreground text-xs">
                      {parsedBeatmapIds.length} unique beatmap
                      {parsedBeatmapIds.length === 1 ? '' : 's'} parsed
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match-ids" className="text-sm font-medium">
                    Match IDs
                  </Label>
                  <Textarea
                    id="match-ids"
                    value={matchIdsInput}
                    onChange={(event) => setMatchIdsInput(event.target.value)}
                    placeholder="12345678, 23456789, 34567890..."
                    disabled={massEnqueueing}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  {matchIdsInput.trim() && (
                    <p className="text-muted-foreground text-xs">
                      {parsedMatchIds.length} unique match
                      {parsedMatchIds.length === 1 ? '' : 'es'} parsed
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  <RadioGroup
                    value={priority}
                    onValueChange={(value) =>
                      setPriority(value as 'Low' | 'Normal' | 'High')
                    }
                    disabled={massEnqueueing}
                    className="flex gap-3"
                  >
                    {(['Low', 'Normal', 'High'] as const).map((p) => (
                      <div key={p} className="flex items-center gap-2">
                        <RadioGroupItem value={p} id={`priority-${p}`} />
                        <Label
                          htmlFor={`priority-${p}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {p}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  disabled={massEnqueueing}
                  className="sm:w-auto"
                >
                  {massEnqueueing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Enqueueing…
                    </>
                  ) : (
                    'Enqueue refetch'
                  )}
                </Button>
              </div>

              {showProgress && massEnqueueing && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-foreground font-semibold">
                      {progressMessage}
                    </span>
                  </div>
                  <div className="mb-2 flex gap-2 text-xs">
                    <span
                      className={
                        progressPhase === 'beatmaps'
                          ? 'text-foreground font-semibold'
                          : 'text-muted-foreground'
                      }
                    >
                      Beatmaps
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span
                      className={
                        progressPhase === 'matches'
                          ? 'text-foreground font-semibold'
                          : 'text-muted-foreground'
                      }
                    >
                      Matches
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {progressPhase}
                      </span>
                      <span className="text-muted-foreground">
                        Batch {currentBatch} of {totalBatches}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2 w-full" />
                    <div className="text-muted-foreground text-right text-xs">
                      {progressPercent.toFixed(0)}% complete
                    </div>
                  </div>
                </div>
              )}

              {massEnqueueCompletionData && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-foreground font-semibold">
                      Results
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Beatmaps</p>
                      <div className="text-foreground text-sm">
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {massEnqueueCompletionData.beatmapsUpdated} enqueued
                        </span>
                        {massEnqueueCompletionData.beatmapsSkipped > 0 && (
                          <>
                            {' • '}
                            <span className="text-muted-foreground">
                              {massEnqueueCompletionData.beatmapsSkipped}{' '}
                              skipped
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Matches</p>
                      <div className="text-foreground text-sm">
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {massEnqueueCompletionData.matchesUpdated} enqueued
                        </span>
                        {massEnqueueCompletionData.matchesSkipped > 0 && (
                          <>
                            {' • '}
                            <span className="text-muted-foreground">
                              {massEnqueueCompletionData.matchesSkipped} skipped
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
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
