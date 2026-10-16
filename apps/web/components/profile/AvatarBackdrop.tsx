'use client';

import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * The player's own avatar, blurred and faded into the surface behind it, for
 * the top of the account menu. A scrim in the surface colour keeps the text
 * on top legible in both themes. The parent must be `relative isolate` and
 * clip its overflow.
 */
export function AvatarBackdrop({
  osuId,
  surface = 'popover',
  className,
}: {
  osuId: number;
  /** The colour the art fades into: the menu's popover or the phone menu's card. */
  surface?: 'popover' | 'card';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      aria-hidden="true"
      data-slot="avatar-backdrop"
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 block overflow-hidden',
        className
      )}
    >
      {failed ? null : (
        <Image
          src={`https://a.ppy.sh/${osuId}`}
          alt=""
          fill
          sizes="256px"
          className="scale-125 object-cover blur-xl saturate-150"
          onError={() => setFailed(true)}
        />
      )}
      <span
        className={cn(
          'absolute inset-0 bg-gradient-to-b',
          surface === 'popover'
            ? 'from-popover/35 via-popover/60 to-popover'
            : 'from-card/35 via-card/60 to-card'
        )}
      />
    </span>
  );
}
