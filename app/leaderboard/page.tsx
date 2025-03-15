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
} from '@/components/ui/pagination';
import { leaderboardFilterSchema } from '@/lib/schema';
import { z } from 'zod';
import LeaderboardFilter from '@/components/leaderboard/LeaderboardFilter';

async function getData(
  params: z.infer<typeof leaderboardFilterSchema> & { page?: number }
) {
  return await leaderboards.get({
    ruleset: Ruleset.Osu,
    pageSize: 25,
    page: params.page || 1,
  });
}

export default async function Page(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const parsedFilters = leaderboardFilterSchema.safeParse(searchParams);
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
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-4">
              Page {page} of {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href={
                page < totalPages
                  ? `?${createQueryString({ page: page + 1 })}`
                  : '#'
              }
              aria-disabled={page >= totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
