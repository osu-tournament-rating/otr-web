import type { TournamentListRequest } from '@/lib/orpc/schema/tournament';
import type { SessionUser } from '@/lib/auth/session-utils';

export type ApiItemType = 'tournament' | 'match' | 'game' | 'score';

/** Common `page.tsx` prop carrying the request's query parameters. */
export type PageSearchParams = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type TournamentListFilterBase = Omit<
  TournamentListRequest,
  'page' | 'pageSize' | 'dateMin' | 'dateMax' | 'searchQuery'
>;

export type TournamentListFilter = TournamentListFilterBase & {
  searchQuery: string;
  dateMin?: Date | string;
  dateMax?: Date | string;
};

export type PaginationParams = Pick<TournamentListRequest, 'page' | 'pageSize'>;

export type Session = {
  user?: SessionUser;
};
