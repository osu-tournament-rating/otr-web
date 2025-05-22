import {
  TournamentsListRequestParams,
  UserDTO,
} from '@osu-tournament-rating/otr-api-client';

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

/** Tournament list request filter */
export type TournamentListFilter = Omit<
  TournamentsListRequestParams,
  'page' | 'pageSize'
> & {
  searchQuery: string;
};

/** Pagination request params */
export type PaginationParams = Pick<
  TournamentsListRequestParams,
  'page' | 'pageSize'
>;

/** Session data */
export type Session = {
  /** Session user, if logged in */
  user?: UserDTO;
};
