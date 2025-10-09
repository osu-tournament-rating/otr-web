'use client';

import { useCallback, useMemo, useState } from 'react';
import { Gavel, Loader2, Search } from 'lucide-react';
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

  const bannedCount = useMemo(
    () => results.filter((entry) => entry.banned).length,
    [results]
  );

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
                      const tooltipLabel = player.banned
                        ? 'Update ban reason'
                        : 'Ban user';

                      return (
                        <TableRow
                          key={player.playerId}
                          className="hover:bg-muted/60"
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
                                  onClick={() => handleOpenBanDialog(player)}
                                >
                                  <Gavel className="size-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                {tooltipLabel}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

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
