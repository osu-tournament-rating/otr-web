'use client';

import { FileMusic, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface RefetchBeatmapDataButtonProps {
  tournament: {
    id: number;
    name: string;
  };
}

export default function RefetchBeatmapDataButton({
  tournament,
}: RefetchBeatmapDataButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleRefetch = async () => {
    setIsLoading(true);
    try {
      const result = await orpc.tournaments.admin.refetchBeatmaps({
        id: tournament.id,
      });

      result.warnings?.forEach((warning) => {
        toast.warning(warning);
      });

      const message =
        result.beatmapsUpdated > 0
          ? `Queued ${result.beatmapsUpdated} beatmap${result.beatmapsUpdated === 1 ? '' : 's'} for refetch` +
            (result.beatmapsSkipped > 0
              ? ` (${result.beatmapsSkipped} deleted beatmap${result.beatmapsSkipped === 1 ? '' : 's'} skipped)`
              : '')
          : 'No beatmaps to refetch';

      toast.success(message);
      setIsOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to queue beatmap data for refetch');
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
            <Button
              variant="outline"
              size="sm"
              className="border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-600 dark:border-yellow-500/50 dark:text-yellow-500 dark:hover:bg-yellow-500/10"
            >
              <FileMusic className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refetch beatmap data</p>
        </TooltipContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Beatmap Data Refetch</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to refetch beatmap data for{' '}
                <strong>{tournament.name}</strong>?
                <br />
                <br />
                <ul className="list-disc pl-4">
                  <li>All tournament beatmaps will be refetched from osu!</li>
                  <li>Deleted beatmaps (404s) will keep their existing data</li>
                  <li>Valid beatmaps will be updated with latest data</li>
                  <li>
                    Missing players will be created from beatmap/beatmapset
                    creators
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
            <Button onClick={handleRefetch} disabled={isLoading}>
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
