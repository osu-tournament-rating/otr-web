import {
  Calendar,
  ChartNoAxesColumn,
  CircleCheck,
  Gamepad2,
  Users,
} from 'lucide-react';

import type { KitIcon } from '@/lib/kit/layout/icon';
import { CHART_CONSTANTS } from '@/lib/utils/chart';

/**
 * The width of a rating bucket. The server groups ratings by this same
 * constant, so the chart reads it from the same place.
 */
export const RATING_BUCKET_SIZE = CHART_CONSTANTS.BUCKET_SIZE;

export interface StatsPanelCopy {
  icon: KitIcon;
  title: string;
  /** The old card's description, where it had one. */
  infoText?: string;
}

/**
 * Each stats panel's header, shared by the panels and the loading screen so
 * the two match.
 */
export const STATS_PANELS = {
  verification: {
    icon: CircleCheck,
    title: 'Tournament verification status',
    infoText:
      'Distribution of tournaments by verification status. "Not in ratings yet" covers Pending, Pre-verified and Pre-rejected tournaments.',
  },
  year: {
    icon: Calendar,
    title: 'Tournaments by year',
    infoText: 'Number of verified tournaments by year',
  },
  ruleset: {
    icon: Gamepad2,
    title: 'Tournaments by ruleset',
    infoText: 'Verified tournaments by ruleset',
  },
  lobbySize: {
    icon: Users,
    title: 'Tournaments by lobby size',
    infoText: 'Verified tournaments by lobby size',
  },
  // The old card had no description, and help text is never invented; the
  // tier legend and the tooltip's rating range explain the bars.
  ratingDistribution: {
    icon: ChartNoAxesColumn,
    title: 'Rating distribution',
  },
} as const satisfies Record<string, StatsPanelCopy>;
