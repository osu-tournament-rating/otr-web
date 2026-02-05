'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface OsuAvatarProps {
  osuId: number;
  username?: string | null;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Optimized avatar component for osu! user avatars.
 * Uses Next.js Image for automatic caching and optimization.
 * Shows fallback icon when image fails to load.
 */
export function OsuAvatar({
  osuId,
  username,
  size = 32,
  className,
  fallback,
}: OsuAvatarProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <Avatar
      className={cn(className)}
      style={{ width: size, height: size }}
    >
      {hasError ? (
        <AvatarFallback className="size-full">
          {fallback ?? <User className="h-1/2 w-1/2" />}
        </AvatarFallback>
      ) : (
        <Image
          src={`https://a.ppy.sh/${osuId}`}
          alt={username ? `${username}'s avatar` : 'User avatar'}
          width={size}
          height={size}
          className="aspect-square size-full rounded-full object-cover"
          onError={() => setHasError(true)}
        />
      )}
    </Avatar>
  );
}
