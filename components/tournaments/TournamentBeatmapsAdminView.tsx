'use client';

import {
  BeatmapDTO,
  GameDTO,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/hooks/useSession';
import {
  insertBeatmaps,
  deleteSpecificBeatmaps,
} from '@/lib/actions/tournaments';
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
import { Checkbox } from '@/components/ui/checkbox';
import SimpleTooltip from '@/components/simple-tooltip';
import TournamentBeatmapsView from './TournamentBeatmapsView';
import TournamentBeatmapsViewWithCheckboxes from './TournamentBeatmapsViewWithCheckboxes';

interface TournamentBeatmapsAdminViewProps {
  tournamentId: number;
  tournamentName: string;
  beatmaps: BeatmapDTO[];
  tournamentGames?: GameDTO[];
}

const UNKNOWN_ARTIST = 'Unknown Artist';
const UNKNOWN_TITLE = 'Unknown Title';
const UNKNOWN_DIFFICULTY = 'Unknown Difficulty';

const isDeletedBeatmap = (beatmap: BeatmapDTO): boolean => {
  const artist = beatmap.beatmapset?.artist || UNKNOWN_ARTIST;
  const title = beatmap.beatmapset?.title || UNKNOWN_TITLE;
  return artist === UNKNOWN_ARTIST && title === UNKNOWN_TITLE;
};

const parseBeatmapIds = (input: string): number[] => {
  return input
    .split(/[,\n]+/)
    .map((id) => id.trim())
    .filter((id) => id)
    .map((id) => {
      const str = id.trim();
      // Parse beatmap URLs or direct IDs
      const match = str.match(
        /^(?:(\d+)|https:\/\/osu\.ppy\.sh\/b\/(\d+)|https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#(?:osu|fruits|mania|taiko)\/(\d+))$/
      );
      const numericId = match
        ? Number(match[1] || match[2] || match[3])
        : parseInt(str, 10);
      // Return 0 for invalid IDs (which will be filtered out)
      return isNaN(numericId) || numericId > 20_000_000 ? 0 : numericId;
    })
    .filter((id) => id > 0); // Only keep valid positive IDs
};

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

  const isAdmin = session?.scopes?.includes(Roles.Admin) ?? false;

  const filteredBeatmaps = useMemo(
    () =>
      showDeleted ? beatmaps : beatmaps.filter((b) => !isDeletedBeatmap(b)),
    [showDeleted, beatmaps]
  );

  const beatmapsWithSelection = useMemo(
    () =>
      filteredBeatmaps.map((beatmap) => ({
        ...beatmap,
        isSelected: selectedBeatmapIds.has(beatmap.id),
        isDeleted: isDeletedBeatmap(beatmap),
      })),
    [filteredBeatmaps, selectedBeatmapIds]
  );

  const deletedBeatmapsCount = useMemo(
    () => beatmaps.filter(isDeletedBeatmap).length,
    [beatmaps]
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
      if (checked) {
        setSelectedBeatmapIds(new Set(filteredBeatmaps.map((b) => b.id)));
      } else {
        setSelectedBeatmapIds(new Set());
      }
    },
    [filteredBeatmaps]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedBeatmapIds.size === 0) return;

    setIsDeleting(true);
    try {
      await deleteSpecificBeatmaps(
        tournamentId,
        Array.from(selectedBeatmapIds)
      );
      const count = selectedBeatmapIds.size;
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
    // Parse the input to extract raw values for validation
    const rawValues = beatmapIdsToAdd
      .split(/[,\n]+/)
      .map((id) => id.trim())
      .filter((id) => id);

    if (rawValues.length === 0) {
      toast.error('Please enter beatmap IDs or URLs');
      return;
    }

    // Check for invalid IDs (non-numeric or exceeding max value)
    const invalidIds = rawValues.filter((value) => {
      const str = value.trim();
      // Check if it's a URL or direct ID
      const match = str.match(
        /^(?:(\d+)|https:\/\/osu\.ppy\.sh\/b\/(\d+)|https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#(?:osu|fruits|mania|taiko)\/(\d+))$/
      );

      if (!match) {
        // Try to parse as a plain number
        const num = parseInt(str, 10);
        return isNaN(num) || num <= 0 || num > 20_000_000;
      }

      const numericId = Number(match[1] || match[2] || match[3]);
      return numericId <= 0 || numericId > 20_000_000;
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

    const ids = parseBeatmapIds(beatmapIdsToAdd);

    if (ids.length === 0) {
      toast.error('No valid beatmap IDs could be parsed from the input');
      return;
    }

    setIsAdding(true);
    try {
      await insertBeatmaps(tournamentId, ids);
      toast.success(
        `Successfully added ${ids.length} beatmap${ids.length === 1 ? '' : 's'}`
      );
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

  if (!isAdmin) {
    return (
      <TournamentBeatmapsView
        beatmaps={beatmaps}
        tournamentGames={tournamentGames}
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Admin action bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={
              filteredBeatmaps.length > 0 &&
              selectedBeatmapIds.size === filteredBeatmaps.length
            }
            onCheckedChange={handleSelectAll}
            aria-label="Select all beatmaps"
          />
          <span className="text-sm text-muted-foreground">
            {selectedBeatmapIds.size > 0
              ? `${selectedBeatmapIds.size} selected`
              : 'Select all'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete selected button */}
          {selectedBeatmapIds.size > 0 && (
            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Selected ({selectedBeatmapIds.size})
                </Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Confirm Beatmap Removal</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      Are you sure you want to remove{' '}
                      <strong>{selectedBeatmapIds.size}</strong> beatmap
                      {selectedBeatmapIds.size === 1 ? '' : 's'} from{' '}
                      <strong>{tournamentName}</strong>?
                    </div>
                  </DialogDescription>
                </DialogHeader>

                {/* Beatmap summary section */}
                <div className="flex-1 space-y-3 overflow-y-auto py-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="mb-2 text-sm font-medium">
                      Beatmaps to be removed:
                    </p>
                    <div className="max-h-60 space-y-1 overflow-y-auto">
                      {Array.from(selectedBeatmapIds).map((beatmapId) => {
                        const beatmap = beatmaps.find(
                          (b) => b.id === beatmapId
                        );
                        if (!beatmap) return null;
                        const artist =
                          beatmap.beatmapset?.artist || UNKNOWN_ARTIST;
                        const title =
                          beatmap.beatmapset?.title || UNKNOWN_TITLE;
                        const version = beatmap.diffName || UNKNOWN_DIFFICULTY;
                        const isDeleted = isDeletedBeatmap(beatmap);

                        return (
                          <div
                            key={beatmapId}
                            className="rounded px-2 py-1 text-sm hover:bg-muted/50"
                          >
                            <div className="flex items-start gap-2">
                              <a
                                href={`https://osu.ppy.sh/beatmaps/${beatmap.osuId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-[3rem] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
                              >
                                #{beatmap.osuId || beatmapId}
                              </a>
                              <div className="flex-1">
                                <span
                                  className={
                                    isDeleted ? 'line-through opacity-50' : ''
                                  }
                                >
                                  {artist} - {title} [{version}]
                                </span>
                                {isDeleted && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (Deleted from osu!)
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Beatmaps
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {/* Add beatmaps button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Beatmaps
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Beatmaps</DialogTitle>
                <DialogDescription>
                  Enter osu! beatmap IDs or URLs to add to the tournament pool.
                  You can enter multiple values separated by commas or new
                  lines.{' '}
                  <strong>
                    Duplicates are safely ignored/merged into existing pool.
                  </strong>
                  <br />
                  <br />
                  <span className="text-sm">
                    Accepted formats:
                    <ul className="mt-1 list-inside list-disc">
                      <li>Direct beatmap ID (e.g., 1234567)</li>
                      <li>Beatmap URL (e.g., https://osu.ppy.sh/b/1234567)</li>
                      <li>
                        Beatmapset URL (e.g.,
                        https://osu.ppy.sh/beatmapsets/123#osu/456)
                      </li>
                    </ul>
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder={`Enter beatmap IDs or URLs`}
                  value={beatmapIdsToAdd}
                  onChange={(e) => setBeatmapIdsToAdd(e.target.value)}
                  rows={5}
                  className="font-mono"
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
                        Add Beatmaps
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Show deleted toggle - far right with just icon */}
          {deletedBeatmapsCount > 0 && (
            <SimpleTooltip
              content={
                showDeleted
                  ? `Hide deleted beatmaps`
                  : `Show ${deletedBeatmapsCount} deleted beatmap${deletedBeatmapsCount === 1 ? '' : 's'}`
              }
            >
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleted(!showDeleted)}
                className="h-8 w-8 p-0"
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

      {/* Modified beatmaps view with checkboxes */}
      <div className="relative">
        <TournamentBeatmapsViewWithCheckboxes
          beatmaps={beatmapsWithSelection}
          tournamentGames={tournamentGames}
          onSelectBeatmap={handleSelectBeatmap}
        />
      </div>
    </div>
  );
}
