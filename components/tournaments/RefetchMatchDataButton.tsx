'use client';

import { refetchMatchData } from '@/lib/actions/tournaments';
import { DatabaseBackup, Loader2 } from 'lucide-react';
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

interface RefetchMatchDataButtonProps {
  tournament: {
    id: number;
    name: string;
  };
}

export default function RefetchMatchDataButton({
  tournament,
}: RefetchMatchDataButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await refetchMatchData(tournament.id);
      toast.success('Queued match data for refetch');
      setIsOpen(false);
    } catch {
      toast.error('Failed to queue match data for refetch');
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
            <Button variant="destructive" size="sm">
              <DatabaseBackup className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refetch match data</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Match Data Refetch</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to refetch match data for{' '}
                <strong>{tournament.name}</strong>? This action cannot be
                undone.
                <br />
                <br />
                <ul className="list-disc pl-4">
                  <li>All match data will be refetched</li>
                  <li>
                    If a match has since been deleted from osu!, the data could
                    be permanently lost.
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
              variant="destructive"
              onClick={handleReset}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Queueing...
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
