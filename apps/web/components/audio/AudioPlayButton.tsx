'use client';

import { IconButton } from '@/components/kit/controls/IconButton';
import { usePreviewButtonState } from '@/lib/hooks/useAudioPlayer';

import { PreviewStatusIcon } from './PreviewStatusIcon';

const SIZES = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
} as const;

interface AudioPlayButtonProps {
  beatmapsetOsuId: number | undefined;
  /** 32px, 36px or 40px, the kit's three heights. */
  size?: keyof typeof SIZES;
  /** `overlay` is the dark pill for cover art. */
  variant?: 'ghost' | 'overlay';
  className?: string;
  artist?: string;
  title?: string;
  difficulty?: string;
}

/** An icon-only preview control: play, pause, resume or retry one beatmapset. */
export default function AudioPlayButton({
  beatmapsetOsuId,
  size = 'md',
  variant = 'ghost',
  className,
  artist,
  title,
  difficulty,
}: AudioPlayButtonProps) {
  const { status, actionLabel, isActive, hasError, handleClick } =
    usePreviewButtonState({ beatmapsetOsuId, artist, title, difficulty });

  if (!beatmapsetOsuId) return null;

  return (
    <IconButton
      label={actionLabel}
      variant={variant}
      size={SIZES[size]}
      className={className}
      onClick={handleClick}
      aria-pressed={isActive && !hasError}
      data-preview-state={status}
    >
      <PreviewStatusIcon status={status} />
    </IconButton>
  );
}
