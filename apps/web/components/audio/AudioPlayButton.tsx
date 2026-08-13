'use client';

import { Button } from '@/components/ui/button';
import {
  PREVIEW_STATUS_ICONS,
  usePreviewButtonState,
} from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';
import SimpleTooltip from '@/components/simple-tooltip';

const sizeConfig = {
  sm: { button: 'h-6 w-6', icon: 'h-3 w-3' },
  md: { button: 'h-8 w-8', icon: 'h-4 w-4' },
  lg: { button: 'h-11 w-11', icon: 'h-5 w-5' },
};

interface AudioPlayButtonProps {
  beatmapsetOsuId: number | undefined;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'default';
  className?: string;
  showTooltip?: boolean;
  artist?: string;
  title?: string;
  difficulty?: string;
}

export default function AudioPlayButton({
  beatmapsetOsuId,
  size = 'md',
  variant = 'ghost',
  className,
  showTooltip = true,
  artist,
  title,
  difficulty,
}: AudioPlayButtonProps) {
  const { status, actionLabel, isActive, isLoading, hasError, handleClick } =
    usePreviewButtonState({ beatmapsetOsuId, artist, title, difficulty });

  if (!beatmapsetOsuId) return null;

  const Icon = PREVIEW_STATUS_ICONS[status];

  const button = (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        sizeConfig[size].button,
        isActive &&
          'ring-1 ring-primary/70 ring-offset-1 ring-offset-background',
        className
      )}
      onClick={handleClick}
      aria-label={actionLabel}
      aria-pressed={isActive && !hasError}
      data-preview-state={status}
    >
      <Icon
        className={cn(sizeConfig[size].icon, isLoading && 'animate-spin')}
      />
    </Button>
  );

  if (!showTooltip) return button;

  return <SimpleTooltip content={actionLabel}>{button}</SimpleTooltip>;
}
