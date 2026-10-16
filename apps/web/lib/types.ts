export type ApiItemType = 'tournament' | 'match' | 'game' | 'score';

/** Common `page.tsx` prop carrying the request's query parameters. */
export type PageSearchParams = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
