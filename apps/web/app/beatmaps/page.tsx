import { Metadata } from 'next';
import { Music } from 'lucide-react';
import Link from 'next/link';

import BeatmapListFilter from '@/components/beatmaps/list/BeatmapListFilter';
import BeatmapListTable from '@/components/beatmaps/list/BeatmapListTable';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { orpc } from '@/lib/orpc/orpc';
import { beatmapListFilterSchema } from '@/lib/validation-schema';

export const metadata: Metadata = {
  title: 'Beatmaps',
  description: 'Browse tournament beatmaps and observed play data.',
};

type FilterData = ReturnType<typeof beatmapListFilterSchema.parse>;

function createUri(filter: FilterData, page: number): string {
  const params = new URLSearchParams();

  if (page > 1) params.set('page', String(page));
  if (filter.q) params.set('q', filter.q);
  if (filter.ruleset !== undefined)
    params.set('ruleset', String(filter.ruleset));

  const numericKeys = [
    'minSr',
    'maxSr',
    'minBpm',
    'maxBpm',
    'minCs',
    'maxCs',
    'minAr',
    'maxAr',
    'minOd',
    'maxOd',
    'minHp',
    'maxHp',
    'minLength',
    'maxLength',
    'minGameCount',
    'maxGameCount',
    'minTournamentCount',
    'maxTournamentCount',
  ] as const;

  for (const key of numericKeys) {
    if (filter[key] !== undefined) params.set(key, String(filter[key]));
  }

  if (filter.sort !== 'gameCount') params.set('sort', filter.sort);
  if (!filter.descending) params.set('descending', 'false');

  return `/beatmaps${params.size ? `?${params}` : ''}`;
}

function hasFilters(filter: FilterData): boolean {
  return Boolean(
    filter.q ||
    filter.ruleset !== undefined ||
    Object.entries(filter).some(
      ([key, value]) =>
        (key.startsWith('min') || key.startsWith('max')) && value !== undefined
    )
  );
}

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filter = beatmapListFilterSchema.parse(await props.searchParams);
  const data = await orpc.beatmaps.list({
    page: filter.page ?? 1,
    pageSize: 30,
    searchQuery: filter.q || undefined,
    ruleset: filter.ruleset,
    minSr: filter.minSr,
    maxSr: filter.maxSr,
    minBpm: filter.minBpm,
    maxBpm: filter.maxBpm,
    minCs: filter.minCs,
    maxCs: filter.maxCs,
    minAr: filter.minAr,
    maxAr: filter.maxAr,
    minOd: filter.minOd,
    maxOd: filter.maxOd,
    minHp: filter.minHp,
    maxHp: filter.maxHp,
    minLength: filter.minLength,
    maxLength: filter.maxLength,
    minGameCount: filter.minGameCount,
    maxGameCount: filter.maxGameCount,
    minTournamentCount: filter.minTournamentCount,
    maxTournamentCount: filter.maxTournamentCount,
    sort: filter.sort,
    descending: filter.descending,
  });

  return (
    <div className="container mx-auto px-4 py-6 sm:px-0 sm:py-0">
      <header className="mb-6 border-b pb-6">
        <div className="flex items-center gap-3">
          <Music className="size-7 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Beatmaps
          </h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Tournament maps and observed play data.
        </p>
      </header>

      <section
        aria-label="Beatmap listing"
        data-testid="beatmap-results"
        className="overflow-hidden rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none"
      >
        <div className="border-b bg-muted/20 p-3 sm:p-4 dark:bg-muted">
          <BeatmapListFilter filter={filter} totalCount={data.totalCount} />
        </div>

        <BeatmapListTable
          beatmaps={data.items}
          isFiltered={hasFilters(filter)}
        />

        {data.totalPages > 1 && (
          <BeatmapPagination
            filter={filter}
            currentPage={data.page}
            totalPages={data.totalPages}
          />
        )}
      </section>
    </div>
  );
}

function BeatmapPagination({
  filter,
  currentPage,
  totalPages,
}: {
  filter: FilterData;
  currentPage: number;
  totalPages: number;
}) {
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );

  return (
    <Pagination
      data-testid="beatmap-pagination"
      className="border-t bg-muted/20 px-3 py-4 dark:bg-muted"
    >
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            data-testid="beatmap-pagination-prev"
            href={createUri(filter, Math.max(1, currentPage - 1))}
            aria-disabled={currentPage <= 1}
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {startPage > 1 && (
          <PaginationItem className="hidden sm:block">
            <Link
              href={createUri(filter, 1)}
              className="flex size-9 items-center justify-center rounded-md text-sm hover:bg-accent"
            >
              1
            </Link>
          </PaginationItem>
        )}
        {startPage > 2 && (
          <PaginationItem className="hidden sm:block">
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {pages.map((page) => (
          <PaginationItem key={page} className="hidden sm:block">
            <Link
              href={createUri(filter, page)}
              aria-current={page === currentPage ? 'page' : undefined}
              className={`flex size-9 items-center justify-center rounded-md text-sm hover:bg-accent ${
                page === currentPage ? 'bg-accent font-semibold' : ''
              }`}
            >
              {page}
            </Link>
          </PaginationItem>
        ))}

        <PaginationItem className="px-2 text-sm sm:hidden">
          {currentPage} / {totalPages}
        </PaginationItem>

        {endPage < totalPages - 1 && (
          <PaginationItem className="hidden sm:block">
            <PaginationEllipsis />
          </PaginationItem>
        )}
        {endPage < totalPages && (
          <PaginationItem className="hidden sm:block">
            <Link
              href={createUri(filter, totalPages)}
              className="flex size-9 items-center justify-center rounded-md text-sm hover:bg-accent"
            >
              {totalPages}
            </Link>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            data-testid="beatmap-pagination-next"
            href={createUri(filter, Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage >= totalPages}
            className={
              currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
