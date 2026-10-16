'use client';

import { Button, type ButtonVariant } from '@/components/kit/controls/Button';
import {
  usePreviewButtonState,
  type PreviewButtonStatus,
} from '@/lib/hooks/useAudioPlayer';

import { PreviewStatusIcon } from './PreviewStatusIcon';

const SHORT_LABELS: Record<PreviewButtonStatus, string> = {
  loading: 'Loading',
  playing: 'Pause',
  error: 'Retry',
  paused: 'Resume',
  idle: 'Preview',
};

interface AudioPreviewButtonProps {
  beatmapsetOsuId: number | undefined;
  /** `overlay` on cover art, as in the beatmap hero; `outline` elsewhere. */
  variant?: Extract<ButtonVariant, 'overlay' | 'outline'>;
  className?: string;
  artist?: string;
  title?: string;
  difficulty?: string;
}

/** The labelled preview button: "Preview", then "Pause", "Resume" or "Retry". */
export default function AudioPreviewButton({
  beatmapsetOsuId,
  variant = 'overlay',
  className,
  artist,
  title,
  difficulty,
}: AudioPreviewButtonProps) {
  const { status, actionLabel, isActive, hasError, handleClick } =
    usePreviewButtonState({ beatmapsetOsuId, artist, title, difficulty });

  if (!beatmapsetOsuId) return null;

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      onClick={handleClick}
      aria-label={actionLabel}
      aria-pressed={isActive && !hasError}
      data-preview-state={status}
    >
      <PreviewStatusIcon status={status} />
      {SHORT_LABELS[status]}
    </Button>
  );
}
