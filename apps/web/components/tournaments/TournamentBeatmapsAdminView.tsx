'use client';

import { Eye, EyeOff, ListChecks, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import BeatmapEmptyState from '@/components/beatmaps/BeatmapEmptyState';
import BeatmapListTable, {
  type BeatmapTableSelection,
} from '@/components/beatmaps/list/BeatmapListTable';
import BeatmapSelectionBar from '@/components/beatmaps/list/BeatmapSelectionBar';
import SimpleTooltip from '@/components/simple-tooltip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { hasAdminScope } from '@/lib/auth/roles';
import type { BeatmapListSortChange } from '@/lib/beatmaps/list-params';
import {
  sortBeatmapTableRows,
  toTournamentBeatmapTableRows,
  type BeatmapTableRow,
} from '@/lib/beatmaps/table-row';
import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';
import type {
  TournamentBeatmap,
  TournamentMatchGame,
} from '@/lib/orpc/schema/tournament';

interface TournamentBeatmapsAdminViewProps {
  tournamentId: number;
  tournamentName: string;
  beatmaps: TournamentBeatmap[];
  tournamentGames?: TournamentMatchGame[];
}

const MAX_BEATMAP_OSU_ID = 20_000_000;

const BEATMAP_ID_PATTERN =
  /^(?:(\d+)|https:\/\/osu\.ppy\.sh\/b\/(\d+)|https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#(?:osu|fruits|mania|taiko)\/(\d+))$/;

const splitBeatmapInput = (input: string): string[] =>
  input
    .split(/[,\n]+/)
    .map((id) => id.trim())
    .filter((id) => id);

const parseBeatmapIds = (input: string): number[] =>
  splitBeatmapInput(input)
    .map((value) => {
      const match = value.match(BEATMAP_ID_PATTERN);
      const numericId = match
        ? Number(match[1] || match[2] || match[3])
        : parseInt(value, 10);
      // 0 marks an unusable value, which the filter below drops.
      return isNaN(numericId) || numericId > MAX_BEATMAP_OSU_ID ? 0 : numericId;
    })
    .filter((id) => id > 0);

export default function TournamentBeatmapsAdminView({
  tournamentId,
  tournamentName,
  beatmaps,
  tournamentGames = [],
}: TournamentBeatmapsAdminViewProps) {
  const session = useSession();
  const router = useRouter();
  const [selectedBeatmapIds, setSelectedBeatmapIds] = useState<Set<number>>(
    new Set()
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [beatmapIdsToAdd, setBeatmapIdsToAdd] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Matches the beatmap list's default so both tables open the same way.
  const [sort, setSort] =
    useState<Parameters<BeatmapListSortChange>[0]>('gameCount');
  const [descending, setDescending] = useState(true);

  const isAdmin = hasAdminScope(session?.scopes);

  const rows = useMemo(
    () => toTournamentBeatmapTableRows(beatmaps, tournamentGames),
    [beatmaps, tournamentGames]
  );

  const deletedBeatmapsCount = useMemo(
    () => rows.filter((row) => row.isDeleted).length,
    [rows]
  );

  const visibleRows = useMemo(() => {
    const shown = showDeleted ? rows : rows.filter((row) => !row.isDeleted);
    return sortBeatmapTableRows(shown, sort, descending);
  }, [rows, showDeleted, sort, descending]);

  // Hiding the deleted rows must also drop them from the pending action: an
  // admin cannot confirm a removal for maps the table is no longer showing.
  const selectedRows = useMemo(
    () => visibleRows.filter((row) => selectedBeatmapIds.has(row.id)),
    [visibleRows, selectedBeatmapIds]
  );

  const changeSort = useCallback<BeatmapListSortChange>(
    (nextSort, nextDescending) => {
      setSort(nextSort);
      setDescending(nextDescending);
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedBeatmapIds(new Set());
  }, []);

  const toggleSelecting = useCallback(() => {
    setIsSelecting((previous) => {
      if (previous) setSelectedBeatmapIds(new Set());
      return !previous;
    });
  }, []);

  const selection = useMemo<BeatmapTableSelection>(
    () => ({
      isSelected: (row) => selectedBeatmapIds.has(row.id),
      onSelect: (row, checked) =>
        setSelectedBeatmapIds((previous) => {
          const next = new Set(previous);
          if (checked) {
            next.add(row.id);
          } else {
            next.delete(row.id);
          }
          return next;
        }),
      allSelected:
        visibleRows.length > 0 && selectedRows.length === visibleRows.length,
      onSelectAll: (checked) =>
        setSelectedBeatmapIds(
          checked ? new Set(visibleRows.map((row) => row.id)) : new Set()
        ),
      getRowLabel: (row: BeatmapTableRow) => row.title,
    }),
    [selectedBeatmapIds, selectedRows, visibleRows]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.length === 0) return;

    setIsDeleting(true);
    try {
      const beatmapIds = selectedRows.map((row) => row.id);

      const result = await orpc.tournaments.admin.manageBeatmaps({
        tournamentId,
        addBeatmapOsuIds: [],
        removeBeatmapIds: beatmapIds,
      });

      result.warnings?.forEach((warning) => {
        toast.warning(warning);
      });

      const count = beatmapIds.length;
      toast.success(
        `Successfully removed ${count} beatmap${count === 1 ? '' : 's'}`
      );
      setSelectedBeatmapIds(new Set());
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to remove beatmaps');
      console.error('Error removing beatmaps:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedRows, tournamentId, router]);

  const handleAddBeatmaps = useCallback(async () => {
    const rawValues = splitBeatmapInput(beatmapIdsToAdd);

    if (rawValues.length === 0) {
      toast.error('Please enter beatmap IDs or URLs');
      return;
    }

    const invalidIds = rawValues.filter((value) => {
      const match = value.match(BEATMAP_ID_PATTERN);

      if (!match) {
        const num = parseInt(value, 10);
        return isNaN(num) || num <= 0 || num > MAX_BEATMAP_OSU_ID;
      }

      const numericId = Number(match[1] || match[2] || match[3]);
      return numericId <= 0 || numericId > MAX_BEATMAP_OSU_ID;
    });

    if (invalidIds.length > 0) {
      const errorMessage =
        invalidIds.length === 1
          ? `Invalid beatmap ID: "${invalidIds[0]}". IDs must be positive integers not exceeding 20,000,000.`
          : `Invalid beatmap IDs found: ${invalidIds
              .slice(0, 3)
              .map((id) => `"${id}"`)
              .join(
                ', '
              )}${invalidIds.length > 3 ? ` and ${invalidIds.length - 3} more` : ''}. IDs must be positive integers not exceeding 20,000,000.`;

      toast.error(errorMessage);
      return;
    }

    const uniqueIds = Array.from(new Set(parseBeatmapIds(beatmapIdsToAdd)));

    if (uniqueIds.length === 0) {
      toast.error('No valid beatmap IDs could be parsed from the input');
      return;
    }

    setIsAdding(true);
    try {
      const result = await orpc.tournaments.admin.manageBeatmaps({
        tournamentId,
        addBeatmapOsuIds: uniqueIds,
        removeBeatmapIds: [],
      });

      const { addedCount, skippedCount } = result;

      result.warnings?.forEach((warning) => {
        toast.warning(warning);
      });

      if (addedCount === 0 && skippedCount > 0) {
        toast.success(
          `No new beatmaps were added. Skipped ${skippedCount} already pooled beatmap${
            skippedCount === 1 ? '' : 's'
          }.`
        );
      } else {
        const parts = [
          `Added ${addedCount} beatmap${addedCount === 1 ? '' : 's'}.`,
        ];

        if (skippedCount > 0) {
          parts.push(
            `Skipped ${skippedCount} beatmap${
              skippedCount === 1 ? '' : 's'
            } already pooled.`
          );
        }

        toast.success(parts.join(' '));
      }
      setBeatmapIdsToAdd('');
      setIsAddDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to add beatmaps');
      console.error('Error adding beatmaps:', error);
    } finally {
      setIsAdding(false);
    }
  }, [beatmapIdsToAdd, tournamentId, router]);

  const emptyState = (
    <BeatmapEmptyState
      testId="tournament-beatmaps-empty"
      title="No beatmaps pooled"
      body="This tournament has no pooled beatmaps."
    />
  );

  const table =
    visibleRows.length === 0 ? (
      emptyState
    ) : (
      <BeatmapListTable
        beatmaps={visibleRows}
        sort={sort}
        descending={descending}
        onSortChange={changeSort}
        showTournamentCount={false}
        selection={isAdmin && isSelecting ? selection : undefined}
        // Unlike the beatmap list, the pool has no compact fallback to drop to
        // on a phone: an admin has to be able to select rows at any width.
        minWidthClassName="min-w-[44rem]"
      />
    );

  if (!isAdmin) return table;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <SimpleTooltip
          content={isSelecting ? 'Done selecting' : 'Select beatmaps'}
        >
          <Button
            data-testid="tournament-beatmaps-select-mode"
            size="icon"
            variant={isSelecting ? 'secondary' : 'ghost'}
            aria-pressed={isSelecting}
            aria-label={isSelecting ? 'Done selecting' : 'Select beatmaps'}
            onClick={toggleSelecting}
            className="size-9 rounded-full"
          >
            <ListChecks className="size-4" />
          </Button>
        </SimpleTooltip>

        {deletedBeatmapsCount > 0 && (
          <SimpleTooltip
            content={
              showDeleted
                ? 'Hide deleted beatmaps'
                : `Show ${deletedBeatmapsCount} deleted beatmap${deletedBeatmapsCount === 1 ? '' : 's'}`
            }
          >
            <Button
              data-testid="tournament-beatmaps-toggle-deleted"
              size="icon"
              variant="ghost"
              aria-pressed={showDeleted}
              aria-label={
                showDeleted ? 'Hide deleted beatmaps' : 'Show deleted beatmaps'
              }
              onClick={() => setShowDeleted(!showDeleted)}
              className="size-9 rounded-full"
            >
              {showDeleted ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </SimpleTooltip>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            {/* Collapsed to its icon until pointed at. The label expands from a
                zero-width grid track, so the button needs no measured width. */}
            <Button
              data-testid="tournament-beatmaps-add"
              aria-label="Add beatmaps"
              className="group h-9 gap-0 rounded-full px-2.5 has-[>svg]:px-2.5"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-200 ease-out group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] motion-reduce:transition-none">
                <span className="overflow-hidden">
                  <span className="pl-1.5 whitespace-nowrap">Add beatmaps</span>
                </span>
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add beatmaps</DialogTitle>
              <DialogDescription asChild>
                <div>
                  <p>
                    Enter osu! beatmap IDs or URLs to add to the tournament
                    pool. You can enter multiple values separated by commas or
                    new lines.{' '}
                    <strong>
                      Duplicates are safely ignored/merged into existing pool.
                    </strong>
                  </p>
                  <p className="mt-2">Accepted formats:</p>
                  <ul className="mt-1 list-inside list-disc">
                    <li>Direct beatmap ID (e.g., 1234567)</li>
                    <li>Beatmap URL (e.g., https://osu.ppy.sh/b/1234567)</li>
                    <li>
                      Beatmapset URL (e.g.,
                      https://osu.ppy.sh/beatmapsets/123#osu/456)
                    </li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter beatmap IDs or URLs"
                value={beatmapIdsToAdd}
                onChange={(e) => setBeatmapIdsToAdd(e.target.value)}
                rows={5}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setBeatmapIdsToAdd('');
                  }}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddBeatmaps} disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add beatmaps
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {table}

      {isSelecting && selectedRows.length > 0 && (
        <BeatmapSelectionBar
          count={selectedRows.length}
          onClear={clearSelection}
        >
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                data-testid="tournament-beatmaps-remove"
                variant="destructive"
                size="sm"
                className="rounded-full"
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>Confirm beatmap removal</DialogTitle>
                <DialogDescription asChild>
                  <div>
                    Are you sure you want to remove{' '}
                    <strong>{selectedRows.length}</strong> beatmap
                    {selectedRows.length === 1 ? '' : 's'} from{' '}
                    <strong>{tournamentName}</strong>?
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 space-y-3 overflow-y-auto py-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-sm font-medium">
                    Beatmaps to be removed:
                  </p>
                  <div className="max-h-60 space-y-1 overflow-y-auto">
                    {selectedRows.map((beatmap) => (
                      <div
                        key={beatmap.id}
                        className="rounded px-2 py-1 text-sm hover:bg-muted/50"
                      >
                        <div className="flex items-start gap-2">
                          <Link
                            href={`/beatmaps/${beatmap.osuId}`}
                            className="min-w-[3rem] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
                          >
                            #{beatmap.osuId || beatmap.id}
                          </Link>
                          <div className="flex-1">
                            <span
                              className={
                                beatmap.isDeleted
                                  ? 'line-through opacity-50'
                                  : ''
                              }
                            >
                              {beatmap.artist} - {beatmap.title} [
                              {beatmap.diffName}]
                            </span>
                            {beatmap.isDeleted && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (deleted from osu!)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    • This will unlink the selected beatmaps from the tournament
                  </p>
                  <p>
                    • The beatmaps themselves will not be deleted from the
                    system
                  </p>
                  <p>• This action cannot be undone</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Remove beatmaps
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </BeatmapSelectionBar>
      )}
    </div>
  );
}
