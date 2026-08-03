'use client';

import { Button } from '@/components/ui/button';
import {
  PREVIEW_STATUS_ICONS,
  usePreviewButtonState,
  type PreviewButtonStatus,
} from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';

const SHORT_LABELS: Record<PreviewButtonStatus, string> = {
  loading: 'Loading',
  playing: 'Pause',
  error: 'Retry',
  paused: 'Resume',
  idle: 'Preview',
};

interface AudioPreviewButtonProps {
  beatmapsetOsuId: number | undefined;
  className?: string;
  artist?: string;
  title?: string;
  difficulty?: string;
}

export default function AudioPreviewButton({
  beatmapsetOsuId,
  className,
  artist,
  title,
  difficulty,
}: AudioPreviewButtonProps) {
  const { status, actionLabel, isActive, isLoading, hasError, handleClick } =
    usePreviewButtonState({ beatmapsetOsuId, artist, title, difficulty });

  if (!beatmapsetOsuId) return null;

  const Icon = PREVIEW_STATUS_ICONS[status];

  return (
    <Button
      variant="secondary"
      size="sm"
      className={cn('gap-1.5', isActive && 'ring-2 ring-primary/60', className)}
      onClick={handleClick}
      aria-label={actionLabel}
      aria-pressed={isActive && !hasError}
      data-preview-state={status}
    >
      <Icon className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
      {SHORT_LABELS[status]}
    </Button>
  );
}
