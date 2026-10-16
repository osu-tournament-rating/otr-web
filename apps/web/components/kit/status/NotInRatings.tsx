import type { VerificationStatus } from '@otr/core/osu';

import {
  NOT_IN_RATINGS_YET_LABEL,
  RATING_FAQ_URL,
  isNotInRatingsYet,
} from '@/lib/kit/status/verification';
import { cn } from '@/lib/utils';

const SUBJECTS = {
  tournament: 'This tournament',
  match: 'This match',
} as const;

/**
 * Says data does not count toward ratings yet, for Pending, Pre-verified
 * and Pre-rejected; renders nothing for the other states. `label` is the
 * muted text for list rows, `notice` the muted sentence under a detail
 * page's header, linking to the Rating FAQ.
 */
export function NotInRatings({
  status,
  variant = 'label',
  subject = 'tournament',
  className,
}: {
  status: VerificationStatus;
  variant?: 'label' | 'notice';
  /** What the notice talks about. */
  subject?: keyof typeof SUBJECTS;
  className?: string;
}) {
  if (!isNotInRatingsYet(status)) {
    return null;
  }

  if (variant === 'label') {
    return (
      <span
        data-slot="not-in-ratings"
        className={cn('text-xs text-muted-foreground', className)}
      >
        {NOT_IN_RATINGS_YET_LABEL}
      </span>
    );
  }

  return (
    <p
      data-slot="not-in-ratings"
      className={cn('text-sm text-pretty text-muted-foreground', className)}
    >
      {SUBJECTS[subject]} is not in ratings yet. If an admin verifies it, it
      counts from the next Tuesday update.{' '}
      <a
        href={RATING_FAQ_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm underline underline-offset-2 transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        Read the rating FAQ
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}
