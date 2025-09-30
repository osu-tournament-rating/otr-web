export const DataFetchStatus = {
  NotFetched: 0,
  Fetching: 1,
  Fetched: 2,
  NotFound: 3,
  Error: 4,
} as const;

export type DataFetchStatus =
  (typeof DataFetchStatus)[keyof typeof DataFetchStatus];

export const isDataFetchStatus = (value: unknown): value is DataFetchStatus =>
  typeof value === 'number' &&
  Object.values(DataFetchStatus).includes(value as DataFetchStatus);
