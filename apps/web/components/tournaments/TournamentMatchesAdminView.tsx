'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/hooks/useSession';
import { hasAdminScope } from '@/lib/auth/roles';
import { orpc } from '@/lib/orpc/orpc';
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
import { Label } from '@/components/ui/label';
import TournamentDataTable from '@/app/tournaments/[id]/data-table';
import TournamentMatchesDataTableWithCheckboxes from './TournamentMatchesDataTableWithCheckboxes';
import { columns, MatchRow } from '@/app/tournaments/[id]/columns';

interface TournamentMatchesAdminViewProps {
  tournamentId: number;
  tournamentName: string;
  matches: MatchRow[];
  isLazer: boolean;
}

const parseMatchIds = (input: string): number[] => {
  return input
    .split(/[,\n]+/)
    .map((id) => id.trim())
    .filter((id) => id)
    .map((id) => {
      const str = id.trim();
      const match = str.match(
        /^(?:(\d+)|https:\/\/osu\.ppy\.sh\/(?:community\/matches|mp)\/(\d+))$/
      );
      const numericId = match
        ? Number(match[1] || match[2])
        : parseInt(str, 10);
      return isNaN(numericId) || numericId > 2_000_000_000 ? 0 : numericId;
    })
    .filter((id) => id > 0);
};

export default function TournamentMatchesAdminView({
  tournamentId,
  tournamentName,
  matches,
  isLazer,
}: TournamentMatchesAdminViewProps) {
  const session = useSession();
  const router = useRouter();
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<number>>(
    new Set()
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [matchIdsToAdd, setMatchIdsToAdd] = useState('');
  const [addAsLazer, setAddAsLazer] = useState(isLazer);

  const isAdmin = hasAdminScope(session?.scopes);

  const matchesWithSelection = useMemo(
    () =>
      matches.map((match) => ({
        ...match,
        isSelected: selectedMatchIds.has(match.id),
      })),
    [matches, selectedMatchIds]
  );

  const handleSelectMatch = useCallback((matchId: number, checked: boolean) => {
    setSelectedMatchIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(matchId);
      } else {
        newSet.delete(matchId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedMatchIds(new Set(matches.map((m) => m.id)));
      } else {
        setSelectedMatchIds(new Set());
      }
    },
    [matches]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedMatchIds.size === 0) return;

    setIsDeleting(true);
    try {
      const matchIds = Array.from(selectedMatchIds);

      const result = await orpc.tournaments.admin.manageMatches({
        tournamentId,
        addMatchOsuIds: [],
        removeMatchIds: matchIds,
      });

      result.warnings?.forEach((warning) => {
        toast.warning(warning);
      });

      const count = result.removedCount;
      toast.success(
        `Successfully removed ${count} match${count === 1 ? '' : 'es'}`
      );
      setSelectedMatchIds(new Set());
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to remove matches');
      console.error('Error removing matches:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedMatchIds, tournamentId, router]);

  const handleAddMatches = useCallback(async () => {
    const rawValues = matchIdsToAdd
      .split(/[,\n]+/)
      .map((id) => id.trim())
      .filter((id) => id);

    if (rawValues.length === 0) {
      toast.error('Please enter match IDs or URLs');
      return;
    }

    const invalidIds = rawValues.filter((value) => {
      const str = value.trim();
      const match = str.match(
        /^(?:(\d+)|https:\/\/osu\.ppy\.sh\/(?:community\/matches|mp)\/(\d+))$/
      );

      if (!match) {
        const num = parseInt(str, 10);
        return isNaN(num) || num <= 0 || num > 2_000_000_000;
      }

      const numericId = Number(match[1] || match[2]);
      return numericId <= 0 || numericId > 2_000_000_000;
    });

    if (invalidIds.length > 0) {
      const errorMessage =
        invalidIds.length === 1
          ? `Invalid match ID: "${invalidIds[0]}". IDs must be positive integers not exceeding 2,000,000,000.`
          : `Invalid match IDs found: ${invalidIds
              .slice(0, 3)
              .map((id) => `"${id}"`)
              .join(
                ', '
              )}${invalidIds.length > 3 ? ` and ${invalidIds.length - 3} more` : ''}. IDs must be positive integers not exceeding 2,000,000,000.`;

      toast.error(errorMessage);
      return;
    }

    const ids = parseMatchIds(matchIdsToAdd);
    const uniqueIds = Array.from(new Set(ids));

    if (uniqueIds.length === 0) {
      toast.error('No valid match IDs could be parsed from the input');
      return;
    }

    setIsAdding(true);
    try {
      const result = await orpc.tournaments.admin.manageMatches({
        tournamentId,
        addMatchOsuIds: uniqueIds.map((osuId) => ({
          osuId,
          isLazer: addAsLazer,
        })),
        removeMatchIds: [],
      });

      result.warnings?.forEach((warning) => {
        toast.warning(warning);
      });

      const { addedCount, skippedCount } = result;

      if (addedCount === 0 && skippedCount > 0) {
        toast.success(
          `No new matches were added. Skipped ${skippedCount} already existing match${
            skippedCount === 1 ? '' : 'es'
          }.`
        );
      } else {
        const parts = [
          `Added ${addedCount} match${addedCount === 1 ? '' : 'es'}.`,
        ];

        if (skippedCount > 0) {
          parts.push(
            `Skipped ${skippedCount} match${
              skippedCount === 1 ? '' : 'es'
            } already existing.`
          );
        }

        toast.success(parts.join(' '));
      }
      setMatchIdsToAdd('');
      setIsAddDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to add matches');
      console.error('Error adding matches:', error);
    } finally {
      setIsAdding(false);
    }
  }, [matchIdsToAdd, tournamentId, addAsLazer, router]);

  if (!isAdmin) {
    return (
      // @ts-expect-error Column def type doesnt work :/
      <TournamentDataTable columns={columns} data={matches} />
    );
  }

  return (
    <div className="space-y-2">
      {/* Admin action bar */}
      <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={
              matches.length > 0 && selectedMatchIds.size === matches.length
            }
            onCheckedChange={handleSelectAll}
            aria-label="Select all matches"
          />
          <span className="text-muted-foreground text-sm">
            {selectedMatchIds.size > 0
              ? `${selectedMatchIds.size} selected`
              : 'Select all'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete selected button */}
          {selectedMatchIds.size > 0 && (
            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Selected ({selectedMatchIds.size})
                </Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Confirm Match Removal</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      Are you sure you want to remove{' '}
                      <strong>{selectedMatchIds.size}</strong> match
                      {selectedMatchIds.size === 1 ? '' : 'es'} from{' '}
                      <strong>{tournamentName}</strong>?
                    </div>
                  </DialogDescription>
                </DialogHeader>

                {/* Match summary section */}
                <div className="flex-1 space-y-3 overflow-y-auto py-2">
                  <div className="bg-muted/30 rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">
                      Matches to be removed:
                    </p>
                    <div className="max-h-60 space-y-1 overflow-y-auto">
                      {Array.from(selectedMatchIds).map((matchId) => {
                        const match = matches.find((m) => m.id === matchId);
                        if (!match) return null;

                        return (
                          <div
                            key={matchId}
                            className="hover:bg-muted/50 rounded px-2 py-1 text-sm"
                          >
                            <div className="flex items-start gap-2">
                              <Link
                                href={`/matches/${match.id}`}
                                className="text-muted-foreground hover:text-primary min-w-[3rem] underline decoration-dotted underline-offset-2"
                              >
                                #{match.id}
                              </Link>
                              <div className="flex-1">
                                <span>{match.name || `Match ${match.id}`}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-muted-foreground space-y-1 text-sm">
                    <p>
                      • This will permanently delete the selected matches from
                      the tournament
                    </p>
                    <p>
                      • All games and scores within these matches will also be
                      deleted
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
                        Remove Matches
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {/* Add matches button */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Matches
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Matches</DialogTitle>
                <DialogDescription asChild>
                  <div>
                    <p>
                      Enter osu! match IDs or URLs to add to the tournament. You
                      can enter multiple values separated by commas or new
                      lines. Match data will be automatically fetched from the
                      osu! API.
                    </p>
                    <p className="mt-2 text-sm">Accepted formats:</p>
                    <ul className="mt-1 list-inside list-disc text-sm">
                      <li>Direct match ID (e.g., 123456789)</li>
                      <li>
                        Match URL (e.g.,
                        https://osu.ppy.sh/community/matches/123456789)
                      </li>
                      <li>Short URL (e.g., https://osu.ppy.sh/mp/123456789)</li>
                    </ul>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder={`Enter match IDs or URLs`}
                  value={matchIdsToAdd}
                  onChange={(e) => setMatchIdsToAdd(e.target.value)}
                  rows={5}
                  className="font-mono"
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lazer-mode"
                    checked={addAsLazer}
                    onCheckedChange={(checked) =>
                      setAddAsLazer(checked === true)
                    }
                  />
                  <Label htmlFor="lazer-mode" className="text-sm">
                    Lazer matches
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setMatchIdsToAdd('');
                    }}
                    disabled={isAdding}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddMatches} disabled={isAdding}>
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add Matches
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Matches table with checkboxes */}
      <div className="relative">
        <TournamentMatchesDataTableWithCheckboxes
          // @ts-expect-error Column def type doesnt work :/
          columns={columns}
          data={matchesWithSelection}
          onSelectMatch={handleSelectMatch}
        />
      </div>
    </div>
  );
}
