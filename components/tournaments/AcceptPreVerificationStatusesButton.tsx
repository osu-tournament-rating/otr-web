'use client';

import { acceptPreVerificationStatuses } from '@/lib/actions/tournaments';
import {
  TournamentCompactDTO,
  VerificationStatus,
  TournamentProcessingStatus,
} from '@osu-tournament-rating/otr-api-client';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AcceptPreVerificationStatusesButtonProps {
  tournament: TournamentCompactDTO;
}

export default function AcceptPreVerificationStatusesButton({
  tournament,
}: AcceptPreVerificationStatusesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Only show button for tournaments that are awaiting verification
  // and have pre-verification statuses (either the tournament itself or its children)
  if (
    tournament.processingStatus !== TournamentProcessingStatus.NeedsVerification
  ) {
    return null;
  }

  // Additional check: only show if tournament itself has pre-verification status
  // (The API endpoint will handle children with pre-verification statuses even if the tournament doesn't)
  if (
    tournament.verificationStatus !== VerificationStatus.PreVerified &&
    tournament.verificationStatus !== VerificationStatus.PreRejected
  ) {
    return null;
  }

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await acceptPreVerificationStatuses({
        id: tournament.id,
      });
      toast.success('Pre-verification statuses accepted successfully');
      setIsOpen(false);
      window.location.reload();
    } catch {
      toast.error('Failed to accept pre-verification statuses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Tooltip>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="default" size="sm">
              <CheckCircle2 className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Accept pre-verification statuses for tournament and children</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Accept Pre-Verification Statuses</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to accept pre-verification statuses for{' '}
                <strong>{tournament.name}</strong>? This action cannot be
                undone.
                <br />
                <br />
                <ul className="list-disc pl-4">
                  <li>Pre-rejected items will be marked as rejected.</li>
                  <li>Pre-verified items will be marked as verified.</li>
                  <li>
                    This action will process the tournament and all its children
                    (matches, games, scores).
                  </li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleAccept}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tooltip>
  );
}
