import { Metadata } from 'next';
import { Music } from 'lucide-react';
import Link from 'next/link';

import { orpc } from '@/lib/orpc/orpc';
import { beatmapListFilterSchema } from '@/lib/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import BeatmapListFilter from '@/components/beatmaps/list/BeatmapListFilter';
import BeatmapListTable from '@/components/beatmaps/list/BeatmapListTable';

export const metadata: Metadata = {
  title: 'Beatmaps',
  description: 'Browse and search tournament beatmaps.',
};

function createUri(
  filter: ReturnType<typeof beatmapListFilterSchema.parse>,
  navPage: number
): string {
  const params = new URLSearchParams();

  if (navPage > 1) params.set('page', String(navPage));
  if (filter.q) params.set('q', filter.q);
  if (filter.ruleset !== undefined)
    params.set('ruleset', String(filter.ruleset));
  if (filter.minSr !== undefined) params.set('minSr', String(filter.minSr));
  if (filter.maxSr !== undefined) params.set('maxSr', String(filter.maxSr));
  if (filter.minBpm !== undefined) params.set('minBpm', String(filter.minBpm));
  if (filter.maxBpm !== undefined) params.set('maxBpm', String(filter.maxBpm));
  if (filter.minCs !== undefined) params.set('minCs', String(filter.minCs));
  if (filter.maxCs !== undefined) params.set('maxCs', String(filter.maxCs));
  if (filter.minAr !== undefined) params.set('minAr', String(filter.minAr));
  if (filter.maxAr !== undefined) params.set('maxAr', String(filter.maxAr));
  if (filter.minOd !== undefined) params.set('minOd', String(filter.minOd));
  if (filter.maxOd !== undefined) params.set('maxOd', String(filter.maxOd));
  if (filter.minHp !== undefined) params.set('minHp', String(filter.minHp));
  if (filter.maxHp !== undefined) params.set('maxHp', String(filter.maxHp));
  if (filter.minLength !== undefined)
    params.set('minLength', String(filter.minLength));
  if (filter.maxLength !== undefined)
    params.set('maxLength', String(filter.maxLength));
  if (filter.sort !== 'gameCount') params.set('sort', filter.sort);
  if (!filter.descending) params.set('descending', 'false');

  return '/beatmaps' + (params.size > 0 ? `?${params}` : '');
}

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filter = beatmapListFilterSchema.parse(await props.searchParams);

  const data = await orpc.beatmaps.list({
    page: filter.page ?? 1,
    pageSize: 50,
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
    sort: filter.sort,
    descending: filter.descending,
  });

  const { totalPages, page: currentPage } = data;

  const renderPageNumbers = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      pages.push(
        <PaginationItem key={1}>
          <Link href={createUri(filter, 1)} className="px-4">
            1
          </Link>
        </PaginationItem>
      );
    }

    if (startPage > 2) {
      pages.push(
        <PaginationItem key="firstEllipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <Link
            href={createUri(filter, i)}
            className={`px-2 sm:px-4 ${i === currentPage ? 'font-bold' : ''}`}
          >
            {i}
          </Link>
        </PaginationItem>
      );
    }

    if (endPage < totalPages - 1) {
      pages.push(
        <PaginationItem key="secondEllipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      pages.push(
        <PaginationItem key={totalPages}>
          <Link href={createUri(filter, totalPages)} className="px-4">
            {totalPages}
          </Link>
        </PaginationItem>
      );
    }

    return pages;
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-2">
              <Music className="text-primary h-6 w-6" />
              <CardTitle className="text-xl font-bold">Beatmaps</CardTitle>
            </div>
            <BeatmapListFilter filter={filter} />
          </div>
        </CardHeader>
        <CardContent>
          <BeatmapListTable beatmaps={data.items} filter={filter} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={
                  currentPage > 1
                    ? createUri(filter, currentPage - 1)
                    : createUri(filter, 1)
                }
                aria-disabled={currentPage <= 1}
                className={
                  currentPage <= 1 ? 'cursor-not-allowed opacity-50' : ''
                }
              />
            </PaginationItem>
            {renderPageNumbers()}
            <PaginationItem>
              <PaginationNext
                href={
                  currentPage < totalPages
                    ? createUri(filter, currentPage + 1)
                    : createUri(filter, totalPages)
                }
                aria-disabled={currentPage >= totalPages}
                className={
                  currentPage >= totalPages
                    ? 'cursor-not-allowed opacity-50'
                    : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
