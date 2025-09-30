import type { TournamentListRequest } from '@/lib/orpc/schema/tournament';
import type { SessionUser } from '@/lib/auth/session-utils';

/** Types of items in the main structure */
export type ApiItemType = 'tournament' | 'match' | 'game' | 'score';

/**
 * Common `page.tsx` prop containing query parameters from the request
 *
 * See {@link https://nextjs.org/docs/app/api-reference/file-conventions/page | Next.js conventions}
 */
export type PageSearchParams = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type TournamentListFilterBase = Omit<
  TournamentListRequest,
  'page' | 'pageSize' | 'dateMin' | 'dateMax' | 'searchQuery'
>;

/** Tournament list request filter */
export type TournamentListFilter = TournamentListFilterBase & {
  searchQuery: string;
  dateMin?: Date | string;
  dateMax?: Date | string;
};

/** Pagination request params */
export type PaginationParams = Pick<TournamentListRequest, 'page' | 'pageSize'>;

/** Session data */
export type Session = {
  /** Session user, if logged in */
  user?: SessionUser;
};
