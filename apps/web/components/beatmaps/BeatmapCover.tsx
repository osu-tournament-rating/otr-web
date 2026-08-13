'use client';

import Image from 'next/image';
import { ImageOff, Music2 } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface BeatmapCoverProps {
  beatmapsetOsuId?: number | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes: string;
  priority?: boolean;
  /**
   * Which osu! derivative to request. Remote covers are `unoptimized`, so
   * `sizes` produces no srcset and asking for a smaller derivative is the only
   * way to keep an 1800px `cover` out of a 40px thumbnail.
   */
  variant?: 'cover' | 'card' | 'list';
}

export default function BeatmapCover({
  beatmapsetOsuId,
  alt,
  className,
  imageClassName,
  sizes,
  priority = false,
  variant = 'cover',
}: BeatmapCoverProps) {
  const [failedBeatmapsetOsuId, setFailedBeatmapsetOsuId] = useState<
    number | null
  >(null);
  const hasError = failedBeatmapsetOsuId === beatmapsetOsuId;
  const hasRemoteCover = Boolean(beatmapsetOsuId) && !hasError;

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-muted text-muted-foreground',
        className
      )}
    >
      <Image
        src={
          hasRemoteCover
            ? `https://assets.ppy.sh/beatmaps/${beatmapsetOsuId}/covers/${variant}@2x.jpg`
            : '/images/beatmap-background-narrow.png'
        }
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={hasRemoteCover}
        onError={() => setFailedBeatmapsetOsuId(beatmapsetOsuId ?? null)}
        className={cn('object-cover', imageClassName)}
      />

      {!hasRemoteCover && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/80">
          {beatmapsetOsuId ? (
            <ImageOff className="size-5" aria-hidden="true" />
          ) : (
            <Music2 className="size-5" aria-hidden="true" />
          )}
          <span className="sr-only">Cover unavailable</span>
        </span>
      )}
    </div>
  );
}
