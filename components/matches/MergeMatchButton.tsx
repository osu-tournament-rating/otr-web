'use client';

import { useState } from 'react';
import { Loader2, Merge } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { MatchDTO } from '@osu-tournament-rating/otr-api-client';

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { get, merge } from '@/lib/actions/matches';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { MatchProcessingStatusEnumHelper } from '@/lib/enums';
import RulesetIcon from '@/components/icons/RulesetIcon';

interface MergeMatchButtonProps {
  match: MatchDTO;
}

const MATCH_ID_SEPARATORS = /[,\s\n]+/;
const TEXTAREA_PLACEHOLDER =
  'Enter match IDs to merge (comma, space, or newline separated)\nExample: 123, 456, 789';

export default function MergeMatchButton({ match }: MergeMatchButtonProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [matchIdsInput, setMatchIdsInput] = useState('');
  const [targetMatches, setTargetMatches] = useState<MatchDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseMatchIds = (input: string): number[] => {
    return input
      .split(MATCH_ID_SEPARATORS)
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);
  };

  const validateMatchIds = (matchIds: number[]): string | null => {
    if (matchIds.length === 0) {
      return 'Please enter valid match IDs';
    }

    const uniqueIds = [...new Set(matchIds)];
    if (uniqueIds.length !== matchIds.length) {
      return 'Duplicate match IDs found';
    }

    if (uniqueIds.includes(match.id)) {
      return 'Cannot merge a match with itself';
    }

    return null;
  };

  const handleFetchMatches = async () => {
    const input = matchIdsInput.trim();
    if (!input) {
      setError('Please enter at least one match ID');
      return;
    }

    const matchIds = parseMatchIds(input);
    const validationError = validateMatchIds(matchIds);

    if (validationError) {
      setError(validationError);
      return;
    }

    const uniqueIds = [...new Set(matchIds)];
    setIsFetching(true);
    setError(null);

    try {
      const fetchPromises = uniqueIds.map((id) => get({ id, verified: false }));
      const fetchedMatches = await Promise.all(fetchPromises);
      setTargetMatches(fetchedMatches);
    } catch {
      setError('One or more matches not found');
    } finally {
      setIsFetching(false);
    }
  };

  const handleMerge = async () => {
    if (targetMatches.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const targetIds = targetMatches.map((m) => m.id);
      await merge(match.id, targetIds);

      const matchNames = targetMatches.map((m) => m.name).join(', ');
      const matchCount = targetMatches.length;
      const pluralSuffix = matchCount > 1 ? 'es' : '';

      toast.success(
        `Successfully merged ${matchCount} match${pluralSuffix} (${matchNames}) into ${match.name}`
      );

      resetDialog();
      router.refresh();
    } catch {
      toast.error('Failed to merge matches');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setShowConfirmation(false);
    setMatchIdsInput('');
    setTargetMatches([]);
    setError(null);
  };

  const handleProceedToConfirmation = () => {
    if (targetMatches.length > 0) {
      setShowConfirmation(true);
    }
  };

  const formatDateTime = (dateTime: string | null | undefined): string => {
    return dateTime ? new Date(dateTime).toLocaleString() : 'N/A';
  };

  const getProcessingStatusText = (status: number): string => {
    return MatchProcessingStatusEnumHelper.getMetadata(status).text;
  };

  const renderTargetMatchInfo = (targetMatch: MatchDTO, index: number) => (
    <div key={targetMatch.id} className="space-y-1 rounded border p-3 text-sm">
      <p>
        <strong>
          #{index + 1} - {targetMatch.name}
        </strong>
      </p>
      <p className="flex items-center gap-2">
        <strong>Ruleset:</strong>
        <RulesetIcon
          ruleset={targetMatch.ruleset}
          className="h-4 w-4 fill-primary"
        />
      </p>
      <p className="flex items-center gap-2">
        <strong>MP Link:</strong>
        <a
          href={`https://osu.ppy.sh/beatmapsets/${targetMatch.osuId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          https://osu.ppy.sh/beatmapsets/{targetMatch.osuId}
        </a>
      </p>
      <p className="flex items-center gap-2">
        <strong>Game Count:</strong>
        {targetMatch.games?.length ?? 0}
      </p>
      <p>
        <strong>End Time:</strong>{' '}
        {formatDateTime(targetMatch.endTime?.toString())}
      </p>
      <p>
        <strong>Processing Status:</strong>{' '}
        {getProcessingStatusText(targetMatch.processingStatus)}
      </p>
      <div className="flex items-center gap-2 text-sm">
        <strong>Verification Status:</strong>
        <VerificationBadge
          verificationStatus={targetMatch.verificationStatus}
          displayText
          warningFlags={targetMatch.warningFlags}
          rejectionReason={targetMatch.rejectionReason}
          entityType="match"
        />
      </div>
    </div>
  );

  const renderTargetMatchesList = () => {
    if (targetMatches.length === 0) return null;

    const matchCount = targetMatches.length;
    const pluralSuffix = matchCount > 1 ? 'es' : '';

    return (
      <div className="space-y-2 rounded-lg border p-4">
        <h4 className="font-semibold">
          Target Match{pluralSuffix} ({matchCount})
        </h4>
        <div className="max-h-60 space-y-3 overflow-y-auto">
          {targetMatches.map(renderTargetMatchInfo)}
        </div>
      </div>
    );
  };

  const renderConfirmationContent = () => {
    const matchCount = targetMatches.length;
    const pluralSuffix = matchCount > 1 ? 'es' : '';

    return (
      <div>
        Are you sure you want to merge{' '}
        <strong>
          {matchCount} match{pluralSuffix}
        </strong>{' '}
        into <strong>{match.name}</strong>?
        <br />
        <br />
        <ul className="list-disc pl-4">
          <li>
            All games from the selected {matchCount} match{pluralSuffix} will be
            moved to {match.name}
          </li>
          <li>
            The following match{pluralSuffix} will be permanently deleted:
            <ul className="mt-1 list-disc pl-4">
              {targetMatches.map((targetMatch) => (
                <li key={targetMatch.id}>&quot;{targetMatch.name}&quot;</li>
              ))}
            </ul>
          </li>
          <li>This action cannot be undone</li>
        </ul>
      </div>
    );
  };

  return (
    <>
      <Tooltip>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <Merge className="size-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Merge matches</p>
          </TooltipContent>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge Matches</DialogTitle>
              <DialogDescription>
                Merge another match into <strong>{match.name}</strong>. All
                games from the target match will be moved to this match, and the
                target match will be deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="matchIds">Target Match IDs</Label>
                <div className="space-y-2">
                  <Textarea
                    id="matchIds"
                    placeholder={TEXTAREA_PLACEHOLDER}
                    value={matchIdsInput}
                    onChange={(e) => setMatchIdsInput(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleFetchMatches}
                    disabled={isFetching || !matchIdsInput.trim()}
                    className="w-full"
                  >
                    {isFetching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Fetch Matches'
                    )}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              {renderTargetMatchesList()}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleProceedToConfirmation}
                disabled={targetMatches.length === 0}
              >
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Tooltip>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Match Merge</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {renderConfirmationContent()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMerge}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Merge className="mr-2 h-4 w-4" />
              )}
              Merge Matches
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
