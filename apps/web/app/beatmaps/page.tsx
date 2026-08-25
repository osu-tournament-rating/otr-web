import { Metadata } from 'next';
import { Music } from 'lucide-react';
import { redirect } from 'next/navigation';

import BeatmapListContent from '@/components/beatmaps/list/BeatmapListContent';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  buildBeatmapListPath,
  normalizeBeatmapSearchQuery,
} from '@/lib/beatmaps/list-params';
import { orpc } from '@/lib/orpc/orpc';
import { beatmapListFilterSchema } from '@/lib/validation-schema';

export const metadata: Metadata = {
  title: 'Beatmaps',
  description: 'Browse tournament beatmaps and observed play data.',
};

type FilterData = ReturnType<typeof beatmapListFilterSchema.parse>;

function hasFilters(filter: FilterData): boolean {
  return Boolean(
    normalizeBeatmapSearchQuery(filter.q) ||
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
    searchQuery: normalizeBeatmapSearchQuery(filter.q),
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

  const lastPage = Math.max(1, data.totalPages);
  if (data.page > lastPage) redirect(buildBeatmapListPath(filter, lastPage));

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
        className="overflow-clip rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none"
      >
        <BeatmapListContent
          beatmaps={data.items}
          filter={filter}
          isFiltered={hasFilters(filter)}
          totalCount={data.totalCount}
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
            href={buildBeatmapListPath(filter, Math.max(1, currentPage - 1))}
            aria-disabled={currentPage <= 1}
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {startPage > 1 && (
          <PaginationItem className="hidden sm:block">
            <PaginationLink href={buildBeatmapListPath(filter, 1)}>
              1
            </PaginationLink>
          </PaginationItem>
        )}
        {startPage > 2 && (
          <PaginationItem className="hidden sm:block">
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {pages.map((page) => (
          <PaginationItem key={page} className="hidden sm:block">
            <PaginationLink
              href={buildBeatmapListPath(filter, page)}
              isActive={page === currentPage}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem
          data-testid="beatmap-pagination-status"
          className="px-2 text-sm sm:hidden"
        >
          {currentPage} / {totalPages}
        </PaginationItem>

        {endPage < totalPages - 1 && (
          <PaginationItem className="hidden sm:block">
            <PaginationEllipsis />
          </PaginationItem>
        )}
        {endPage < totalPages && (
          <PaginationItem className="hidden sm:block">
            <PaginationLink href={buildBeatmapListPath(filter, totalPages)}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            data-testid="beatmap-pagination-next"
            href={buildBeatmapListPath(
              filter,
              Math.min(totalPages, currentPage + 1)
            )}
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
