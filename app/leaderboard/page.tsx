import { orpc } from '@/lib/orpc/orpc';
import { LeaderboardDataTable } from './data-table';
import { columns } from './columns';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { leaderboardFilterSchema } from '@/lib/schema';
import { z } from 'zod';
import LeaderboardFilter from '@/components/leaderboard/LeaderboardFilter';
import Link from 'next/link';
import { createSearchParamsFromSchema } from '@/lib/utils/leaderboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Leaderboard',
  description:
    'View the global tournament rating leaderboard and player rankings.',
};

async function getData(params: z.infer<typeof leaderboardFilterSchema>) {
  const response = await orpc.leaderboard.list({
    page: params.page,
    ruleset: params.ruleset,
    country: params.country?.trim() ? params.country.trim() : undefined,
    minOsuRank: params.minOsuRank,
    maxOsuRank: params.maxOsuRank,
    minRating: params.minRating,
    maxRating: params.maxRating,
    minMatches: params.minMatches,
    maxMatches: params.maxMatches,
    minWinRate: (params.minWinRate ?? 0) / 100,
    maxWinRate: (params.maxWinRate ?? 100) / 100,
    tiers: params.tiers && params.tiers.length > 0 ? params.tiers : undefined,
  });

  console.log('[leaderboard] getData response', response);

  return response;
}

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filter = leaderboardFilterSchema.parse(await props.searchParams);
  const data = await getData(filter);

  const totalPages = data.pages;
  const page = data.page ?? filter.page ?? 1;

  // Helper to create query string with existing params
  const createUri = (navPage: number): string => {
    const navParams = createSearchParamsFromSchema({
      ...filter,
      page: navPage,
    });

    return '/leaderboard' + (navParams.size > 0 ? `?${navParams}` : '');
  };

  const renderPageNumbers = () => {
    const pages = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
      pages.push(
        <PaginationItem key={1}>
          <Link href={createUri(1)} className="px-4">
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
            href={createUri(i)}
            className={`px-2 sm:px-4 ${i === page ? 'font-bold' : ''}`}
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
          <Link href={createUri(totalPages)} className="px-4">
            {totalPages}
          </Link>
        </PaginationItem>
      );
    }

    return pages;
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      {/* Leaderboard Table */}
      {data && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl font-bold">
                  Global Leaderboard
                </CardTitle>
              </div>
              <LeaderboardFilter filter={filter} />
            </div>
          </CardHeader>
          <CardContent>
            <LeaderboardDataTable columns={columns} data={data.leaderboard} />
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={page > 1 ? createUri(page - 1) : createUri(1)}
              aria-disabled={page <= 1}
              className={page <= 1 ? 'cursor-not-allowed opacity-50' : ''}
            />
          </PaginationItem>
          {renderPageNumbers()}
          <PaginationItem>
            <PaginationNext
              href={
                page < totalPages
                  ? String(createUri(page + 1))
                  : String(createUri(totalPages))
              }
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages ? 'cursor-not-allowed opacity-50' : ''
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
