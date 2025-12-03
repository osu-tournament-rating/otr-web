'use client';

import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioPlayer, useIsPlaying } from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';

interface AudioPreviewButtonProps {
  beatmapsetOsuId: number | undefined;
  className?: string;
}

export default function AudioPreviewButton({
  beatmapsetOsuId,
  className,
}: AudioPreviewButtonProps) {
  const { state, togglePlayPause } = useAudioPlayer();
  const isPlaying = useIsPlaying(beatmapsetOsuId);
  const isLoading =
    state.isLoading && state.currentlyPlaying === beatmapsetOsuId;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (beatmapsetOsuId) {
      togglePlayPause(beatmapsetOsuId);
    }
  };

  if (!beatmapsetOsuId) return null;

  const Icon = isLoading ? Loader2 : isPlaying ? Pause : Play;

  return (
    <Button
      variant="secondary"
      size="sm"
      className={cn('gap-1.5', className)}
      onClick={handleClick}
    >
      <Icon className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
      {isPlaying ? 'Pause' : 'Preview'}
    </Button>
  );
}
