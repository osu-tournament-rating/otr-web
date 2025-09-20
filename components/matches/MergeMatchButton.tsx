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
import VerificationBadge from '@/components/badges/VerificationBadge';
import { RulesetEnumHelper } from '@/lib/enums';
import { Ruleset } from '@/lib/osu/enums';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '../simple-tooltip';
import { orpc } from '@/lib/orpc/orpc';
import type { MatchDetail } from '@/lib/orpc/schema/match';
import { resolveErrorMessage } from '@/lib/utils/error';

interface MergeMatchButtonProps {
  match: {
    id: number;
    name: string;
  };
}

const MATCH_ID_SEPARATORS = /[,\s\n]+/;
const TEXTAREA_PLACEHOLDER =
  'Enter child match IDs (comma, space, or newline separated)\nExample: 123, 456, 789';

export default function MergeMatchButton({ match }: MergeMatchButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [matchIdsInput, setMatchIdsInput] = useState('');
  const [childMatches, setChildMatches] = useState<MatchDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const parseMatchIds = (input: string): number[] =>
    input
      .split(MATCH_ID_SEPARATORS)
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => Number.isFinite(id) && id > 0);

  const validateMatchIds = (matchIds: number[]): string | null => {
    if (matchIds.length === 0) {
      return 'Please enter valid match IDs';
    }

    const uniqueIds = new Set(matchIds);
    if (uniqueIds.size !== matchIds.length) {
      return 'Duplicate match IDs found';
    }

    if (uniqueIds.has(match.id)) {
      return 'Cannot merge a match into itself';
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

    const uniqueIds = Array.from(new Set(matchIds));
    setIsFetching(true);
    setError(null);

    try {
      const fetchedMatches = await Promise.all(
        uniqueIds.map((id) => orpc.matches.get({ id }))
      );
      setChildMatches(fetchedMatches);
    } catch (err) {
      const message = resolveErrorMessage(
        err,
        'One or more matches could not be retrieved'
      );
      console.error('Failed to fetch matches for merge', err);
      setError(message);
      toast.error(message);
      setChildMatches([]);
    } finally {
      setIsFetching(false);
    }
  };

  const handleMerge = async () => {
    if (childMatches.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const childIds = childMatches.map((m) => m.id);
      const response = await orpc.matches.admin.merge({
        id: match.id,
        childMatchIds: childIds,
      });

      toast.success(
        `Merged ${response.mergedMatchCount} child match${
          response.mergedMatchCount === 1 ? '' : 'es'
        } into parent match ${match.name}`
      );

      handleCancel();
      router.refresh();
    } catch (err) {
      const message = resolveErrorMessage(err, 'Failed to merge matches');
      console.error('Failed to merge matches', err);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setShowConfirmation(false);
    setMatchIdsInput('');
    setChildMatches([]);
    setError(null);
  };

  const handleBackToInput = () => {
    setShowConfirmation(false);
  };

  const handleProceedToConfirmation = () => {
    if (childMatches.length > 0) {
      setShowConfirmation(true);
    }
  };

  const formatDateTime = (dateTime: string | null | undefined): string =>
    dateTime ? new Date(dateTime).toLocaleString() : 'N/A';

  const renderChildMatchInfo = (childMatch: MatchDetail, index: number) => {
    const ruleset = (childMatch.games?.[0]?.ruleset ?? 0) as Ruleset;
    const rulesetLabel =
      RulesetEnumHelper.getMetadata(ruleset)?.text ?? 'Unknown';

    return (
      <div key={childMatch.id} className="space-y-1 rounded border p-3 text-sm">
        <p>
          <strong>
            #{index + 1} - {childMatch.name}
          </strong>
        </p>
        <p className="flex items-center gap-2">
          <strong>Ruleset:</strong>
          <SimpleTooltip content={rulesetLabel}>
            <RulesetIcon ruleset={ruleset} className="h-4 w-4 fill-primary" />
          </SimpleTooltip>
        </p>
        {childMatch.osuId && (
          <p className="flex items-center gap-2">
            <strong>MP Link:</strong>
            <a
              href={`https://osu.ppy.sh/community/matches/${childMatch.osuId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              https://osu.ppy.sh/community/matches/{childMatch.osuId}
            </a>
          </p>
        )}
        <p className="flex items-center gap-2">
          <strong>Game Count:</strong>
          {childMatch.games?.length ?? 0}
        </p>
        <p>
          <strong>End Time:</strong>{' '}
          {formatDateTime(childMatch.endTime ?? null)}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <strong>Verification Status:</strong>
          <VerificationBadge
            verificationStatus={childMatch.verificationStatus}
            displayText
            warningFlags={childMatch.warningFlags}
            rejectionReason={childMatch.rejectionReason}
            entityType="match"
          />
        </div>
      </div>
    );
  };

  const renderChildMatchesList = () => {
    if (childMatches.length === 0) return null;

    const matchCount = childMatches.length;
    const pluralSuffix = matchCount > 1 ? 'es' : '';

    return (
      <div className="space-y-2 rounded-lg border p-4">
        <h4 className="font-semibold">
          Child Match{pluralSuffix} ({matchCount})
        </h4>
        <div className="max-h-60 space-y-3 overflow-y-auto">
          {childMatches.map(renderChildMatchInfo)}
        </div>
      </div>
    );
  };

  if (showConfirmation) {
    const matchCount = childMatches.length;
    const pluralSuffix = matchCount > 1 ? 'es' : '';

    return (
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Match Merge</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to merge{' '}
                <strong>
                  {matchCount} child match{pluralSuffix}
                </strong>{' '}
                into parent match <strong>{match.name}</strong>? This action
                cannot be undone.
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
          <p>Merge matches</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Matches</DialogTitle>
            <DialogDescription>
              Merge child matches into parent match{' '}
              <strong>{match.name}</strong>. All games from the child matches
              will be moved here, and the child matches will be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matchIds">Child Match IDs</Label>
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
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    'Fetch Matches'
                  )}
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            {renderChildMatchesList()}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleProceedToConfirmation}
              disabled={childMatches.length === 0}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tooltip>
  );
}
