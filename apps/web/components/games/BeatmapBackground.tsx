'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BeatmapBackgroundProps {
  beatmapsetId?: number;
  alt: string;
  className?: string;
}

export default function BeatmapBackground({
  beatmapsetId,
  alt,
  className,
}: BeatmapBackgroundProps) {
  const [hasError, setHasError] = useState(false);

  const fallbackSrc = '/images/beatmap-background-narrow.png';
  const beatmapSrc = beatmapsetId
    ? `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover@2x.jpg`
    : fallbackSrc;

  const isExternalImage = !!beatmapsetId && !hasError;

  return (
    <Image
      className={cn('z-1 absolute object-cover', 'rounded-xl', className)}
      src={hasError ? fallbackSrc : beatmapSrc}
      alt={alt}
      fill
      onError={() => setHasError(true)}
      unoptimized={isExternalImage}
    />
  );
}
