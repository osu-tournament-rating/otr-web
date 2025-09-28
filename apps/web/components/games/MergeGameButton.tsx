'use client';

import { useState } from 'react';
import { Loader2, Merge } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { orpc } from '@/lib/orpc/orpc';
import type { Game } from '@/lib/orpc/schema/match';
import type { GameAdminPreview } from '@/lib/orpc/schema/match';
import { resolveErrorMessage } from '@/lib/utils/error';

interface MergeGameButtonProps {
  game: Game;
}

const GAME_ID_SEPARATORS = /[,\s\n]+/;
const TEXTAREA_PLACEHOLDER =
  'Enter child game IDs (comma, space, or newline separated)\nExample: 123, 456, 789';

export default function MergeGameButton({ game }: MergeGameButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [gameIdsInput, setGameIdsInput] = useState('');
  const [childGames, setChildGames] = useState<GameAdminPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [beatmapMismatch, setBeatmapMismatch] = useState<string | null>(null);

  const parseGameIds = (input: string): number[] =>
    input
      .split(GAME_ID_SEPARATORS)
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => Number.isFinite(id) && id > 0);

  const validateGameIds = (gameIds: number[]): string | null => {
    if (gameIds.length === 0) {
      return 'Please enter valid game IDs';
    }

    const uniqueIds = new Set(gameIds);
    if (uniqueIds.size !== gameIds.length) {
      return 'Duplicate game IDs found';
    }

    if (uniqueIds.has(game.id)) {
      return 'Cannot merge a game with itself';
    }

    return null;
  };

  const handleFetchGames = async () => {
    const input = gameIdsInput.trim();
    if (!input) {
      setError('Please enter at least one game ID');
      return;
    }

    const gameIds = parseGameIds(input);
    const validationError = validateGameIds(gameIds);

    if (validationError) {
      setError(validationError);
      return;
    }

    const uniqueIds = Array.from(new Set(gameIds));
    setIsFetching(true);
    setError(null);
    setBeatmapMismatch(null);

    try {
      const previews = await orpc.games.admin.lookup({ ids: uniqueIds });
      if (previews.length !== uniqueIds.length) {
        throw new Error('Some games were not returned');
      }

      const previewMap = new Map(
        previews.map((preview) => [preview.id, preview])
      );
      const orderedPreviews = uniqueIds.map((id) => previewMap.get(id));

      if (orderedPreviews.some((preview) => !preview)) {
        throw new Error('Some games could not be resolved');
      }

      setChildGames(orderedPreviews as GameAdminPreview[]);
      const mergedBeatmapId = game.beatmap?.osuId ?? null;
      const mismatched = (orderedPreviews as GameAdminPreview[]).find(
        (preview) => preview.beatmapOsuId !== mergedBeatmapId
      );

      if (mismatched) {
        setBeatmapMismatch(
          `Game ${mismatched.id} features a different beatmap than the parent game.`
        );
      } else {
        setBeatmapMismatch(null);
      }
    } catch (err) {
      const message = resolveErrorMessage(
        err,
        'One or more games could not be retrieved'
      );
      console.error('Failed to fetch games for merge', err);
      setError(message);
      toast.error(message);
      setChildGames([]);
      setBeatmapMismatch(null);
    } finally {
      setIsFetching(false);
    }
  };

  const handleMerge = async () => {
    if (childGames.length === 0 || beatmapMismatch) {
      return;
    }

    setIsLoading(true);
    try {
      const childIds = childGames.map((g) => g.id);
      const response = await orpc.games.admin.merge({
        id: game.id,
        childGameIds: childIds,
      });

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Games merged successfully!</span>
          <span className="text-sm">
            Moved {response.movedScoreCount} score
            {response.movedScoreCount === 1 ? '' : 's'} from{' '}
            {response.mergedGameCount} child game
            {response.mergedGameCount === 1 ? '' : 's'} into Game #{game.id}
          </span>
        </div>
      );

      handleCancel();
      router.refresh();
    } catch (err) {
      const message = resolveErrorMessage(err, 'Failed to merge games');
      console.error('Failed to merge games', err);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setShowConfirmation(false);
    setGameIdsInput('');
    setChildGames([]);
    setError(null);
    setBeatmapMismatch(null);
  };

  const handleBackToInput = () => {
    setShowConfirmation(false);
  };

  const handleProceedToConfirmation = () => {
    if (childGames.length > 0) {
      setShowConfirmation(true);
    }
  };

  const formatDateTime = (dateTime: string | null | undefined): string =>
    dateTime ? new Date(dateTime).toLocaleString() : 'N/A';

  const renderChildGameInfo = (childGame: GameAdminPreview) => (
    <div key={childGame.id} className="space-y-1 rounded border p-3 text-sm">
      <p className="font-semibold">Game #{childGame.id}</p>
      <p className="text-muted-foreground break-words text-xs">
        {childGame.beatmapTitle ?? 'Unknown beatmap'}[
        {childGame.beatmapDifficulty ?? 'Unknown difficulty'}]
      </p>
      <div className="space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">Beatmap ID:</span>{' '}
          <span className="font-mono">{childGame.beatmapOsuId ?? 'N/A'}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Players:</span>{' '}
          <span
            className={
              childGame.scoresCount === 0 ? 'text-destructive' : undefined
            }
          >
            {childGame.scoresCount} player
            {childGame.scoresCount === 1 ? '' : 's'}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Played:</span>{' '}
          {formatDateTime(childGame.startTime)}
        </p>
      </div>
    </div>
  );

  const renderChildGamesList = () => {
    if (childGames.length === 0) return null;

    const gameCount = childGames.length;
    const pluralSuffix = gameCount > 1 ? 's' : '';

    return (
      <div className="space-y-2 rounded-lg border p-4">
        <h4 className="font-semibold">
          Child Game{pluralSuffix} ({gameCount})
        </h4>
        <div className="max-h-60 space-y-3 overflow-y-auto">
          {childGames.map(renderChildGameInfo)}
        </div>
      </div>
    );
  };

  if (showConfirmation) {
    const gameCount = childGames.length;
    const pluralSuffix = gameCount > 1 ? 's' : '';
    const totalScoresMoved = childGames.reduce(
      (sum, child) => sum + child.scoresCount,
      0
    );
    const scorePlural = totalScoresMoved === 1 ? '' : 's';

    return (
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Game Merge</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to merge {gameCount} child game{pluralSuffix}{' '}
                  into <strong>Game #{game.id}</strong>.
                </p>
                <div className="bg-muted space-y-1 rounded-md p-3 text-sm">
                  <p>This will:</p>
                  <ul className="text-muted-foreground list-inside list-disc space-y-1">
                    <li>
                      Move {totalScoresMoved} score{scorePlural} to Game #
                      {game.id}
                    </li>
                    <li>
                      Permanently delete {gameCount} child game{pluralSuffix}
                    </li>
                  </ul>
                </div>
                <p className="text-destructive text-sm font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleBackToInput}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleMerge}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                'Merge'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Tooltip>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm">
              <Merge className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Merge games</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Games</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Merge scores from child games into{' '}
                  <strong>Game #{game.id}</strong>.
                </p>
                <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
                  <li>All scores will be moved to this game</li>
                  <li>Child games will be permanently deleted</li>
                  <li>Games must have the same beatmap</li>
                  <li>Players cannot have scores in multiple games</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gameIds">Child Game IDs</Label>
              <div className="space-y-2">
                <Textarea
                  id="gameIds"
                  placeholder={TEXTAREA_PLACEHOLDER}
                  value={gameIdsInput}
                  onChange={(e) => setGameIdsInput(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleFetchGames}
                  disabled={isFetching || !gameIdsInput.trim()}
                  className="w-full"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    'Fetch Games'
                  )}
                </Button>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              {beatmapMismatch && (
                <p className="text-destructive text-sm">{beatmapMismatch}</p>
              )}
            </div>

            {renderChildGamesList()}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleProceedToConfirmation}
              disabled={childGames.length === 0 || Boolean(beatmapMismatch)}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tooltip>
  );
}
