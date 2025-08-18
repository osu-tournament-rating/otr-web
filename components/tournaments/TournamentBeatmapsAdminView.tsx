'use client';

import {
  BeatmapDTO,
  GameDTO,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
      setSelectedBeatmapIds(new Set(beatmaps.map((b) => b.id)));
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

  // Create beatmaps with checkbox state
  const beatmapsWithSelection = beatmaps.map((beatmap) => ({
    ...beatmap,
    isSelected: selectedBeatmapIds.has(beatmap.id),
  }));

  return (
    <div className="space-y-4">
      {/* Admin action bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={
              beatmaps.length > 0 && selectedBeatmapIds.size === beatmaps.length
            }
            onCheckedChange={handleSelectAll}
            aria-label="Select all beatmaps"
          />
          <span className="text-sm text-muted-foreground">
            {selectedBeatmapIds.size > 0
              ? `${selectedBeatmapIds.size} selected`
              : 'Select beatmaps'}
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Beatmap Removal</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      Are you sure you want to remove{' '}
                      <strong>{selectedBeatmapIds.size}</strong> beatmap
                      {selectedBeatmapIds.size === 1 ? '' : 's'} from{' '}
                      <strong>{tournamentName}</strong>?
                      <br />
                      <br />
                      <ul className="list-disc pl-4">
                        <li>
                          This will unlink the selected beatmaps from the
                          tournament.
                        </li>
                        <li>
                          The beatmaps themselves will not be deleted from the
                          system.
                        </li>
                      </ul>
                    </div>
                  </DialogDescription>
                </DialogHeader>
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
                  enter multiple IDs separated by commas or new lines.
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
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Beatmaps
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
