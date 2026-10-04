import { readLatestRatingCreated } from '@otr/core/db';
import { createRatingRecalculationTracker } from '@otr/core/maintenance';

import { db } from '@/lib/db';

/** This process's view of whether new ratings are pending; see the core tracker. */
export const ratingRecalculationTracker = createRatingRecalculationTracker({
  readLatestRatingCreated: () => readLatestRatingCreated(db),
  onRecheckError: (error) =>
    console.error('[maintenance] Failed to read the latest rating', error),
});
