'use client';

import Image from 'next/image';
import { useState } from 'react';

interface BeatmapBackgroundProps {
  beatmapsetId?: number;
  alt: string;
}

export default function BeatmapBackground({
  beatmapsetId,
  alt,
}: BeatmapBackgroundProps) {
  const [hasError, setHasError] = useState(false);

  const fallbackSrc = '/images/beatmap-background-narrow.png';
  const beatmapSrc = beatmapsetId
    ? `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover@2x.jpg`
    : fallbackSrc;

  const isExternalImage = !!beatmapsetId && !hasError;

  return (
    <Image
      className="absolute z-1 rounded-xl object-cover"
      src={hasError ? fallbackSrc : beatmapSrc}
      alt={alt}
      fill
      onError={() => setHasError(true)}
      unoptimized={isExternalImage}
    />
  );
}
