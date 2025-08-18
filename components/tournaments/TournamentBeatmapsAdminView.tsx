'use client';

import {
  BeatmapDTO,
  GameDTO,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
import { useState } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import TournamentBeatmapsView from './TournamentBeatmapsView';
import TournamentBeatmapsViewWithCheckboxes from './TournamentBeatmapsViewWithCheckboxes';

interface TournamentBeatmapsAdminViewProps {
  tournamentId: number;
  tournamentName: string;
  beatmaps: BeatmapDTO[];
  tournamentGames?: GameDTO[];
}

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

  const handleSelectBeatmap = (beatmapId: number, checked: boolean) => {
    setSelectedBeatmapIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(beatmapId);
      } else {
        newSet.delete(beatmapId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBeatmapIds(new Set(filteredBeatmaps.map((b) => b.id)));
    } else {
      setSelectedBeatmapIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedBeatmapIds.size === 0) return;

    setIsDeleting(true);
    try {
      await deleteSpecificBeatmaps(
        tournamentId,
        Array.from(selectedBeatmapIds)
      );
      toast.success(
        `Successfully removed ${selectedBeatmapIds.size} beatmap${
          selectedBeatmapIds.size === 1 ? '' : 's'
        }`
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
  };

  const handleAddBeatmaps = async () => {
    const ids = beatmapIdsToAdd
      .split(/[,\n]+/)
      .map((id) => id.trim())
      .filter((id) => id)
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      toast.error('Please enter valid beatmap IDs');
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
  };

  if (!isAdmin) {
    return (
      <TournamentBeatmapsView
        beatmaps={beatmaps}
        tournamentGames={tournamentGames}
      />
    );
  }

  // Filter beatmaps based on showDeleted state
  const isDeletedBeatmap = (beatmap: BeatmapDTO) => {
    const artist = beatmap.beatmapset?.artist || 'Unknown Artist';
    const title = beatmap.beatmapset?.title || 'Unknown Title';
    return artist === 'Unknown Artist' && title === 'Unknown Title';
  };

  const filteredBeatmaps = showDeleted
    ? beatmaps
    : beatmaps.filter((b) => !isDeletedBeatmap(b));

  // Create beatmaps with checkbox state
  const beatmapsWithSelection = filteredBeatmaps.map((beatmap) => ({
    ...beatmap,
    isSelected: selectedBeatmapIds.has(beatmap.id),
    isDeleted: isDeletedBeatmap(beatmap),
  }));

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
                          beatmap.beatmapset?.artist || 'Unknown Artist';
                        const title =
                          beatmap.beatmapset?.title || 'Unknown Title';
                        const version =
                          beatmap.diffName || 'Unknown Difficulty';
                        const isDeleted =
                          artist === 'Unknown Artist' &&
                          title === 'Unknown Title';

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
                  Enter osu! beatmap IDs to add to the tournament pool. You can
                  enter multiple IDs separated by commas or new lines.{' '}
                  <strong>Duplicates are safely ignored.</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter beatmap IDs (e.g., 1234567, 2345678)"
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

          {/* Spacer to push the eye button to the right */}
          <div className="flex-1" />

          {/* Show deleted toggle - far right with just icon */}
          {beatmaps.some(isDeletedBeatmap) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleted(!showDeleted)}
                    className="h-8 w-8 p-0"
                  >
                    {showDeleted ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {showDeleted
                      ? `Hide deleted beatmaps`
                      : `Show ${beatmaps.filter(isDeletedBeatmap).length} deleted beatmap${beatmaps.filter(isDeletedBeatmap).length === 1 ? '' : 's'}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
