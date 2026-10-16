import { Ruleset } from '@otr/core/osu';

import { RATED_RULESETS } from '@/lib/kit/format/ruleset';
import { defineListParams, enumParam } from '@/lib/kit/lists/params';

/**
 * The stats page's address: the rating distribution's ruleset
 * (`/stats?ruleset=1`). osu! is the default and is never written.
 */
export const STATS_PARAMS = defineListParams({
  ruleset: enumParam(RATED_RULESETS, { default: Ruleset.Osu, role: 'scope' }),
});
