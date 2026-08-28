'use client';

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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { orpc } from '@/lib/orpc/orpc';

interface AcceptPreVerificationStatusesButtonProps {
  tournament: {
    id: number;
    name: string;
  };
}

export default function AcceptPreVerificationStatusesButton({
  tournament,
}: AcceptPreVerificationStatusesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await orpc.tournaments.admin.acceptPreVerificationStatuses({
        id: tournament.id,
      });
      toast.success('Pre-verified and pre-rejected statuses accepted');
      setIsOpen(false);
      window.location.reload();
    } catch {
      toast.error('Failed to accept pre-verified and pre-rejected statuses');
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
          <p>Accept pre-verified and pre-rejected statuses</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Accept pre-verified and pre-rejected statuses
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to accept pre-verified and pre-rejected
                statuses for <strong>{tournament.name}</strong>? This action
                cannot be undone.
                <br />
                <br />
                <ul className="list-disc pl-4">
                  <li>
                    This action will process the tournament and all its children
                    (matches, games, scores).
                  </li>
                  <li>
                    Everything under a rejected item will be marked as rejected,
                    even if it is already verified.
                  </li>
                  <li>
                    Elsewhere, pre-rejected items will be marked as rejected and
                    pre-verified items will be marked as verified.
                  </li>
                  <li>
                    Pending items are left alone unless they sit under a
                    rejected item.
                  </li>
                  <li>
                    Warning flags are cleared on matches and games it changes.
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
