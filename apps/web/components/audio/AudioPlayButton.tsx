'use client';

import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioPlayer, useIsPlaying } from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';
import SimpleTooltip from '@/components/simple-tooltip';

const sizeConfig = {
  sm: { button: 'h-6 w-6', icon: 'h-3 w-3' },
  md: { button: 'h-8 w-8', icon: 'h-4 w-4' },
};

interface AudioPlayButtonProps {
  beatmapsetOsuId: number | undefined;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'default';
  className?: string;
  showTooltip?: boolean;
}

export default function AudioPlayButton({
  beatmapsetOsuId,
  size = 'md',
  variant = 'ghost',
  className,
  showTooltip = true,
}: AudioPlayButtonProps) {
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

  const button = (
    <Button
      variant={variant}
      size="icon"
      className={cn(sizeConfig[size].button, className)}
      onClick={handleClick}
    >
      <Icon
        className={cn(sizeConfig[size].icon, isLoading && 'animate-spin')}
      />
    </Button>
  );

  if (!showTooltip) return button;

  return (
    <SimpleTooltip content={isPlaying ? 'Pause preview' : 'Play preview'}>
      {button}
    </SimpleTooltip>
  );
}
