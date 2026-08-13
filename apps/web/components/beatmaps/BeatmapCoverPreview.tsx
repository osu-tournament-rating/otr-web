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

/**
 * The hover affordance over beatmap artwork: the cover dims and a play button
 * appears in its middle. Hover is a pointer-only signal, so coarse pointers
 * keep the button permanently visible over its own scrim instead, and the cover
 * of the loaded track stays lit so it is identifiable without hovering.
 */
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
      // Above the surface-wide row link so the button stays clickable, while
      // the tint never intercepts a click meant for the link beneath it.
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
        // The tint and the icon already say what the control does, and a
        // tooltip here covers the artwork it is offering to preview.
        showTooltip={false}
        className={cn(
          'pointer-events-auto rounded-full bg-black/55 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/70 hover:text-white focus-visible:opacity-100 pointer-coarse:opacity-100',
          isActive && 'opacity-100'
        )}
      />
    </div>
  );
}
