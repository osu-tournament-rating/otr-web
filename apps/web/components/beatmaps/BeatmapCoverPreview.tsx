'use client';

import AudioPlayButton from '@/components/audio/AudioPlayButton';
import { usePreviewButtonState } from '@/lib/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';

interface BeatmapCoverPreviewProps {
  beatmapsetOsuId?: number | null;
  artist: string;
  title: string;
  difficulty: string;
  size?: 'sm' | 'md' | 'lg';
  /** Must match the cover's own radius: the tint covers the whole artwork. */
  className?: string;
}

/** Hover affordance over beatmap artwork: the cover dims and a play button appears. */
export default function BeatmapCoverPreview({
  beatmapsetOsuId,
  artist,
  title,
  difficulty,
  size = 'md',
  className,
}: BeatmapCoverPreviewProps) {
  const { isActive } = usePreviewButtonState({
    beatmapsetOsuId: beatmapsetOsuId ?? undefined,
    artist,
    title,
    difficulty,
  });

  if (!beatmapsetOsuId) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-colors duration-200 group-hover:bg-black/50 focus-within:bg-black/50',
        isActive && 'bg-black/50',
        className
      )}
    >
      <AudioPlayButton
        beatmapsetOsuId={beatmapsetOsuId}
        artist={artist}
        title={title}
        difficulty={difficulty}
        size={size}
        variant="ghost"
        showTooltip={false}
        className={cn(
          'pointer-events-auto rounded-full bg-black/55 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/70 hover:text-white focus-visible:opacity-100 pointer-coarse:opacity-100',
          isActive && 'opacity-100'
        )}
      />
    </div>
  );
}
