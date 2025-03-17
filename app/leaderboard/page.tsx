import { leaderboards } from '@/lib/api';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
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

async function getData(
  params: z.infer<typeof leaderboardFilterSchema> & { page?: number }
) {
  return await leaderboards.get({
    ruleset: Ruleset.Osu,
    pageSize: 25,
    bronze: params.tiers?.includes('bronze'),
    silver: params.tiers?.includes('silver'),
    gold: params.tiers?.includes('gold'),
    platinum: params.tiers?.includes('platinum'),
    emerald: params.tiers?.includes('emerald'),
    diamond: params.tiers?.includes('diamond'),
    master: params.tiers?.includes('master'),
    grandmaster: params.tiers?.includes('grandmaster'),
    eliteGrandmaster: params.tiers?.includes('eliteGrandmaster'),
    ...params,
  });
}

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;

  // Preprocess searchParams to convert numeric strings to numbers and ensure tiers is an array
  const processedSearchParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => {
      if (key === 'tiers') {
        // Ensure tiers is always an array
        if (Array.isArray(value)) {
          return [key, value];
        } else if (typeof value === 'string') {
          return [key, [value]];
        } else {
          return [key, []];
        }
      } else if (typeof value === 'string' && !isNaN(Number(value))) {
        return [key, Number(value)];
      }
      return [key, value];
    })
  );

  const parsedFilters = leaderboardFilterSchema.safeParse(
    processedSearchParams
  );
  const filters = parsedFilters.success ? parsedFilters.data : {};
  const page =
    typeof searchParams.page === 'string'
      ? parseInt(searchParams.page) || 1
      : 1;

  const data = await getData({ ...filters, page });
  const totalPages = 100;

  // Helper to create query string with existing params
  const createQueryString = (params: Record<string, string | number>) => {
    const newParams = new URLSearchParams();

    // Add existing search params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => newParams.append(key, v));
      } else if (value) {
        newParams.set(key, value);
      }
    });

    // Add/update new params
    Object.entries(params).forEach(([key, value]) => {
      newParams.set(key, value.toString());
    });

    return newParams.toString();
  };

  const renderPageNumbers = () => {
    const pages = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
      pages.push(
        <PaginationItem key={1}>
          <Link href={`?${createQueryString({ page: 1 })}`} className="px-4">
            1
          </Link>
        </PaginationItem>
      );
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
            href={`?${createQueryString({ page: i })}`}
            className={`px-4 ${i === page ? 'font-bold' : ''}`}
          >
            {i}
          </Link>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      pages.push(
        <PaginationItem key="secondEllipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
      pages.push(
        <PaginationItem key={100}>
          <Link href={`?${createQueryString({ page: 100 })}`} className="px-4">
            100
          </Link>
        </PaginationItem>
      );
    }

    return pages;
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-4 flex justify-end">
        <LeaderboardFilter />
      </div>
      {data && (
        <LeaderboardDataTable
          columns={columns}
          data={data.result.leaderboard}
        />
      )}
      <Pagination className="mt-2">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={
                page > 1 ? `?${createQueryString({ page: page - 1 })}` : '#'
              }
              aria-disabled={page <= 1}
              className={page <= 1 ? 'cursor-not-allowed opacity-50' : ''}
            />
          </PaginationItem>
          {renderPageNumbers()}
          <PaginationItem>
            <PaginationNext
              href={
                page < totalPages
                  ? `?${createQueryString({ page: page + 1 })}`
                  : '#'
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
