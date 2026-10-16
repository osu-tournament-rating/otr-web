import { VerificationStatus } from '@otr/core/osu';

import { isNotInRatingsYet } from '@/lib/kit/status/verification';

/**
 * What the Ratings and Stats tabs say when a tournament has no player
 * statistics. They are computed for verified tournaments only, by the
 * Tuesday update, so the empty state says why from the tournament's status,
 * in the words of the status tooltips.
 */
export function getTournamentStatsEmptyCopy(
  status: VerificationStatus,
  subject: 'Rating changes' | 'Player statistics'
): { title: string; description: string } {
  const noun = subject.toLowerCase();

  if (status === VerificationStatus.Rejected) {
    return {
      title: `No ${noun}`,
      description: 'Rejected tournaments are not counted in ratings.',
    };
  }

  return {
    title: `No ${noun} yet`,
    description: isNotInRatingsYet(status)
      ? `${subject} show here from the Tuesday update after an admin verifies this tournament.`
      : `${subject} show here from the Tuesday update after this tournament was verified.`,
  };
}
