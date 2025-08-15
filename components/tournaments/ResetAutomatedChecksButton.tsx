'use client';

import { rerunAutomatedChecks } from '@/lib/actions/tournaments';
import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import { Loader2, RefreshCcwDotIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

interface ResetAutomatedChecksButtonProps {
  tournament: TournamentCompactDTO;
}

export default function ResetAutomatedChecksButton({
  tournament,
}: ResetAutomatedChecksButtonProps) {
  const [forceReset, setForceReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await rerunAutomatedChecks({
        id: tournament.id,
        overrideVerifiedState: forceReset,
      });
      toast.success('Automated checks reset successfully');
      setIsOpen(false);
      window.location.reload();
    } catch {
      toast.error('Failed to reset automated checks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setForceReset(false);
  };

  return (
    <Tooltip>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <RefreshCcwDotIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Reset automated checks</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reset Automated Checks</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to reset automated checks for{' '}
                <strong>{tournament.name}</strong>? This action cannot be
                undone.
                <br />
                <br />
                <ul className="list-disc pl-4">
                  <li>This action will cascade to all children.</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="force-reset"
              checked={forceReset}
              onCheckedChange={(checked) => setForceReset(checked === true)}
              disabled={isLoading}
            />
            <label
              htmlFor="force-reset"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Reset verified and rejected data
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
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
