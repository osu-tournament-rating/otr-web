'use client';

import { useState } from 'react';
import { Loader2, Merge } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { GameDTO } from '@osu-tournament-rating/otr-api-client';

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

import { mergeGames } from '@/lib/actions/games';
import { get } from '@/lib/actions/games';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { RulesetEnumHelper } from '@/lib/enums';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '../simple-tooltip';

interface MergeGameButtonProps {
  game: GameDTO;
}

const GAME_ID_SEPARATORS = /[,\s\n]+/;
const TEXTAREA_PLACEHOLDER =
  'Enter game IDs to merge (comma, space, or newline separated)\nExample: 123, 456, 789';

export default function MergeGameButton({ game }: MergeGameButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [gameIdsInput, setGameIdsInput] = useState('');
  const [targetGames, setTargetGames] = useState<GameDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const parseGameIds = (input: string): number[] => {
    return input
      .split(GAME_ID_SEPARATORS)
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);
  };

  const validateGameIds = (gameIds: number[]): string | null => {
    if (gameIds.length === 0) {
      return 'Please enter valid game IDs';
    }

    const uniqueIds = [...new Set(gameIds)];
    if (uniqueIds.length !== gameIds.length) {
      return 'Duplicate game IDs found';
    }

    if (uniqueIds.includes(game.id)) {
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

    const uniqueIds = [...new Set(gameIds)];
    setIsFetching(true);
    setError(null);

    try {
      const fetchPromises = uniqueIds.map((id) => get({ id, verified: false }));
      const fetchedGames = await Promise.all(fetchPromises);
      setTargetGames(fetchedGames);
    } catch {
      setError('One or more games not found');
    } finally {
      setIsFetching(false);
    }
  };

  const handleMerge = async () => {
    if (targetGames.length === 0) return;

    setIsLoading(true);
    try {
      const targetIds = targetGames.map((g) => g.id);
      await mergeGames(game.id, targetIds);

      const gameCount = targetGames.length;
      const totalScoresMoved = targetGames.reduce((sum, g) => sum + (g.scores?.length ?? 0), 0);
      const pluralSuffix = gameCount > 1 ? 's' : '';
      const scorePlural = totalScoresMoved !== 1 ? 's' : '';

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Games merged successfully!</span>
          <span className="text-sm">
            Moved {totalScoresMoved} score{scorePlural} from {gameCount} game{pluralSuffix} into Game #{game.id}
          </span>
        </div>
      );

      handleCancel();
      router.refresh();
    } catch {
      toast.error('Failed to merge games');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setShowConfirmation(false);
    setGameIdsInput('');
    setTargetGames([]);
    setError(null);
  };

  const handleBackToInput = () => {
    setShowConfirmation(false);
  };

  const handleProceedToConfirmation = () => {
    if (targetGames.length > 0) {
      setShowConfirmation(true);
    }
  };

  const formatDateTime = (dateTime: string | null | undefined): string => {
    return dateTime ? new Date(dateTime).toLocaleString() : 'N/A';
  };

  const renderTargetGameInfo = (targetGame: GameDTO, index: number) => {
    const beatmapTitle = targetGame.beatmap?.beatmapset?.title || 'Unknown beatmap';
    const diffName = targetGame.beatmap?.diffName || 'Unknown difficulty';
    const playerCount = targetGame.scores?.length ?? 0;
    
    return (
      <div key={targetGame.id} className="space-y-1 rounded border p-3 text-sm">
        <p className="font-semibold">
          Game #{targetGame.id}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {beatmapTitle} [{diffName}]
        </p>
        <div className="space-y-1 text-xs">
          <p>
            <span className="text-muted-foreground">Match ID:</span>{' '}
            <span className="font-mono">{targetGame.match?.id || 'N/A'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Beatmap ID:</span>{' '}
            <span className="font-mono">{targetGame.beatmap?.osuId || 'N/A'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Players:</span>{' '}
            <span className={playerCount === 0 ? 'text-destructive' : ''}>
              {playerCount} {playerCount === 1 ? 'player' : 'players'}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Played:</span>{' '}
            {formatDateTime(targetGame.startTime?.toString())}
          </p>
        </div>
      </div>
    );
  };

  const renderTargetGamesList = () => {
    if (targetGames.length === 0) return null;

    const gameCount = targetGames.length;
    const pluralSuffix = gameCount > 1 ? 's' : '';
    const totalScores = targetGames.reduce((sum, g) => sum + (g.scores?.length ?? 0), 0);

    // Check for validation issues
    const differentMatches = targetGames.some(g => g.match?.id !== game.match?.id);
    const differentBeatmaps = targetGames.some(g => g.beatmap?.osuId !== game.beatmap?.osuId);

    return (
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold">
            Source Game{pluralSuffix} to Merge
          </h4>
          <span className="text-xs text-muted-foreground">
            {totalScores} total score{totalScores !== 1 ? 's' : ''}
          </span>
        </div>
        
        {(differentMatches || differentBeatmaps) && (
          <div className="text-sm text-destructive space-y-1">
            {differentMatches && <p>⚠️ Warning: Some games are from different matches</p>}
            {differentBeatmaps && <p>⚠️ Warning: Some games have different beatmaps</p>}
          </div>
        )}
        
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {targetGames.map((targetGame, index) => renderTargetGameInfo(targetGame, index))}
        </div>
      </div>
    );
  };

  if (showConfirmation) {
    const gameCount = targetGames.length;
    const totalScoresMoved = targetGames.reduce((sum, g) => sum + (g.scores?.length ?? 0), 0);
    const pluralSuffix = gameCount > 1 ? 's' : '';
    const scorePlural = totalScoresMoved !== 1 ? 's' : '';

    return (
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Game Merge</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to merge <strong>{gameCount} game{pluralSuffix}</strong> into{' '}
                  <strong>Game #{game.id}</strong>
                </p>
                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p>This will:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Move {totalScoresMoved} player score{scorePlural} to Game #{game.id}</li>
                    <li>Permanently delete {gameCount} source game{pluralSuffix}</li>
                    <li>Cannot be undone</li>
                  </ul>
                </div>
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
                  Merge scores from other games into <strong>Game #{game.id}</strong>
                </p>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>• All scores will be moved to this game</p>
                  <p>• Source games will be permanently deleted</p>
                  <p>• Games must be from the same match and beatmap</p>
                  <p>• Players cannot have scores in multiple games</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gameIds">Target Game IDs</Label>
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
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            {renderTargetGamesList()}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleProceedToConfirmation}
              disabled={targetGames.length === 0}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tooltip>
  );
}