'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OsuAvatarProps {
  osuId: number;
  username?: string | null;
  size?: number;
  className?: string;
}

/**
 * Optimized avatar component for osu! user avatars.
 * Uses Next.js Image for automatic caching and optimization.
 */
export function OsuAvatar({
  osuId,
  username,
  size = 32,
  className,
}: OsuAvatarProps) {
  return (
    <Image
      src={`https://a.ppy.sh/${osuId}`}
      alt={username ? `${username}'s avatar` : 'User avatar'}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      unoptimized={false}
    />
  );
}
