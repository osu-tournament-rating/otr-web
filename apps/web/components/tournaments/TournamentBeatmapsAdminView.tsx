'use client';

import { Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  beatmapColumns,
  type TournamentBeatmapRow,
} from '@/app/tournaments/[id]/beatmap-columns';
import BeatmapEmptyState from '@/components/beatmaps/BeatmapEmptyState';
import SimpleTooltip from '@/components/simple-tooltip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { isDeletedTournamentBeatmap } from '@/lib/beatmaps/presentation';
import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';
import type {
  TournamentBeatmap,
  TournamentMatchGame,
} from '@/lib/orpc/schema/tournament';
import { Mods } from '@otr/core/osu';

import TournamentDataTableWithCheckboxes from './TournamentDataTableWithCheckboxes';

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

/**
 * The mod each pooled beatmap was most often played under, in one pass over
 * the tournament's games. Resolving this per row instead rescans every game
 * once per beatmap, which a 1000-map pool feels.
 */
function buildTopModIndex(
  games: TournamentMatchGame[]
): Map<number, { mod: Mods; gameCount: number }> {
  const countsByBeatmap = new Map<number, Map<Mods, number>>();

  for (const game of games) {
    const osuId = game.beatmap?.osuId;
    if (osuId === undefined || osuId === null) continue;

    let counts = countsByBeatmap.get(osuId);
    if (!counts) {
      counts = new Map<Mods, number>();
      countsByBeatmap.set(osuId, counts);
    }
    counts.set(game.mods, (counts.get(game.mods) ?? 0) + 1);
  }

  const topMods = new Map<number, { mod: Mods; gameCount: number }>();

  for (const [osuId, counts] of countsByBeatmap) {
    let mod = Mods.None;
    let topCount = 0;
    let gameCount = 0;

    for (const [candidate, count] of counts) {
      gameCount += count;
      if (count > topCount) {
        topCount = count;
        mod = candidate;
      }
    }

    topMods.set(osuId, { mod, gameCount });
  }

  return topMods;
}

const getBeatmapLabel = (beatmap: TournamentBeatmapRow) =>
  beatmap.beatmapset?.title || 'beatmap';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [beatmapIdsToAdd, setBeatmapIdsToAdd] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const isAdmin = hasAdminScope(session?.scopes);

  const rows = useMemo<TournamentBeatmapRow[]>(() => {
    const topMods = buildTopModIndex(tournamentGames);

    return beatmaps.map((beatmap) => ({
      ...beatmap,
      topMod: topMods.get(beatmap.osuId) ?? null,
      isDeleted: isDeletedTournamentBeatmap(beatmap),
    }));
  }, [beatmaps, tournamentGames]);

  const deletedBeatmapsCount = useMemo(
    () => rows.filter((row) => row.isDeleted).length,
    [rows]
  );

  const visibleRows = useMemo(
    () => (showDeleted ? rows : rows.filter((row) => !row.isDeleted)),
    [rows, showDeleted]
  );

  const handleSelectBeatmap = useCallback(
    (beatmapId: number, checked: boolean) => {
      setSelectedBeatmapIds((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(beatmapId);
        } else {
          newSet.delete(beatmapId);
        }
        return newSet;
      });
    },
    []
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedBeatmapIds(
        checked ? new Set(visibleRows.map((row) => row.id)) : new Set()
      );
    },
    [visibleRows]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedBeatmapIds.size === 0) return;

    setIsDeleting(true);
    try {
      const beatmapIds = Array.from(selectedBeatmapIds);

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
  }, [selectedBeatmapIds, tournamentId, router]);

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

  if (!isAdmin) {
    return visibleRows.length === 0 ? (
      emptyState
    ) : (
      <TournamentDataTableWithCheckboxes
        columns={beatmapColumns}
        data={visibleRows}
        getRowId={(row) => row.id}
        getRowLabel={getBeatmapLabel}
        emptyMessage="No beatmaps found."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            data-testid="tournament-beatmaps-select-all"
            checked={
              visibleRows.length > 0 &&
              selectedBeatmapIds.size === visibleRows.length
            }
            onCheckedChange={(checked) => handleSelectAll(checked === true)}
            aria-label="Select all beatmaps"
          />
          <span className="text-sm text-muted-foreground">
            {selectedBeatmapIds.size > 0
              ? `${selectedBeatmapIds.size} selected`
              : 'Select all'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedBeatmapIds.size > 0 && (
            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  data-testid="tournament-beatmaps-remove"
                  variant="destructive"
                  size="lg"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove selected ({selectedBeatmapIds.size})
                </Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Confirm beatmap removal</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      Are you sure you want to remove{' '}
                      <strong>{selectedBeatmapIds.size}</strong> beatmap
                      {selectedBeatmapIds.size === 1 ? '' : 's'} from{' '}
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
                      {Array.from(selectedBeatmapIds).map((beatmapId) => {
                        const beatmap = rows.find(
                          (row) => row.id === beatmapId
                        );
                        if (!beatmap) return null;

                        return (
                          <div
                            key={beatmapId}
                            className="rounded px-2 py-1 text-sm hover:bg-muted/50"
                          >
                            <div className="flex items-start gap-2">
                              <Link
                                href={`/beatmaps/${beatmap.osuId}`}
                                className="min-w-[3rem] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
                              >
                                #{beatmap.osuId || beatmapId}
                              </Link>
                              <div className="flex-1">
                                <span
                                  className={
                                    beatmap.isDeleted
                                      ? 'line-through opacity-50'
                                      : ''
                                  }
                                >
                                  {beatmap.beatmapset?.artist ||
                                    'Unknown artist'}{' '}
                                  -{' '}
                                  {beatmap.beatmapset?.title || 'Unknown title'}{' '}
                                  [{beatmap.diffName || 'Unknown difficulty'}]
                                </span>
                                {beatmap.isDeleted && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (deleted from osu!)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      • This will unlink the selected beatmaps from the
                      tournament
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
          )}

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="tournament-beatmaps-add" size="lg">
                <Plus className="h-4 w-4" />
                Add beatmaps
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
                variant="outline"
                aria-pressed={showDeleted}
                aria-label={
                  showDeleted
                    ? 'Hide deleted beatmaps'
                    : 'Show deleted beatmaps'
                }
                onClick={() => setShowDeleted(!showDeleted)}
                className="size-10"
              >
                {showDeleted ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </SimpleTooltip>
          )}
        </div>
      </div>

      {visibleRows.length === 0 ? (
        emptyState
      ) : (
        <TournamentDataTableWithCheckboxes
          columns={beatmapColumns}
          data={visibleRows}
          getRowId={(row) => row.id}
          getRowLabel={getBeatmapLabel}
          isRowSelected={(row) => selectedBeatmapIds.has(row.id)}
          onSelectRow={handleSelectBeatmap}
          emptyMessage="No beatmaps found."
        />
      )}
    </div>
  );
}
