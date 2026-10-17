import { defineListParams, pageParam } from '@/lib/kit/lists/params';

/** My reports holds every report the visitor filed and pages them here. */
export const MY_REPORTS_PAGE_SIZE = 50;

export const MY_REPORTS_PARAMS = defineListParams({
  page: pageParam(),
});
