'use client';

import { deleteTournament } from '@/lib/actions/tournaments';
import { deleteMatch } from '@/lib/actions/matches';
import { deleteGame } from '@/lib/actions/games';
import { deleteScore } from '@/lib/actions/scores';
import { Loader2, Trash2 } from 'lucide-react';
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

type EntityType = 'tournament' | 'match' | 'game' | 'score';

interface DeleteButtonProps {
  entityType: EntityType;
  entityId: number;
  entityName: string;
  onDeleted?: () => void;
}

const deleteActions = {
  tournament: deleteTournament,
  match: deleteMatch,
  game: deleteGame,
  score: deleteScore,
};

const entityLabels = {
  tournament: 'tournament',
  match: 'match',
  game: 'game',
  score: 'score',
};

export default function DeleteButton({
  entityType,
  entityId,
  entityName,
  onDeleted,
}: DeleteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteActions[entityType](entityId);
      toast.success(`${entityLabels[entityType]} deleted successfully`);
      setIsOpen(false);
      onDeleted?.();
    } catch {
      toast.error(`Failed to delete ${entityLabels[entityType]}`);
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
              <Trash2 className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete {entityLabels[entityType]}</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete {entityLabels[entityType]}</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to delete <strong>{entityName}</strong>?
                This action cannot be undone.
                <br />
                <br />
                <ul className="list-disc pl-4">
                  <li>This action will cascade to all children.</li>
                  <li>All associated data will be permanently removed.</li>
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
