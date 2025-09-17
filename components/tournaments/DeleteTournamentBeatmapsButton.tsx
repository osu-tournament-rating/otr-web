'use client';

import { deleteBeatmaps } from '@/lib/actions/tournaments';
import { Loader2, Music } from 'lucide-react';
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

interface DeleteTournamentBeatmapsButtonProps {
  tournament: {
    id: number;
    name: string;
  };
}

export default function DeleteTournamentBeatmapsButton({
  tournament,
}: DeleteTournamentBeatmapsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteBeatmaps(tournament.id);
      toast.success('Pooled beatmaps deleted successfully');
      setIsOpen(false);
      window.location.reload();
    } catch {
      toast.error('Failed to delete pooled beatmaps');
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
              <Music className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete pooled beatmaps</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete Pooled Beatmaps</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to delete all pooled beatmaps from{' '}
                <strong>{tournament.name}</strong>? This action cannot be
                undone.
                <br />
                <br />
                <ul className="list-disc pl-4">
                  <li>This action unlinks all beatmaps from the tournament.</li>
                  <li>
                    The beatmaps themselves will not be deleted from the system.
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
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tooltip>
  );
}
