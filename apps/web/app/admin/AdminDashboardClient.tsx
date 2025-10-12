'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { getApiKeyPreview } from '@/lib/utils/apiKey';

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
                    <Avatar className="size-12 border">
                      <AvatarImage
                        src={`https://a.ppy.sh/${result.osuId}`}
                        alt={`${result.username}'s avatar`}
                      />
                      <AvatarFallback>
                        {result.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
