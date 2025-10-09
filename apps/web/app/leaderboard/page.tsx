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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy } from 'lucide-react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';

export const metadata: Metadata = {
  title: 'Global Leaderboard',
  description:
    'View the global tournament rating leaderboard and player rankings.',
};

async function getData(params: z.infer<typeof leaderboardFilterSchema>) {
  const filter = {
    ...params,
    country: params.country?.trim() ? params.country.trim() : undefined,
    minWinRate: (params.minWinRate ?? 0) / 100,
    maxWinRate: (params.maxWinRate ?? 100) / 100,
    tiers: params.tiers && params.tiers.length > 0 ? params.tiers : undefined,
  };

  if (params.friend) {
    const currentUser = await orpc.users.me();
    filter.userId = currentUser.player.id;
  }

  const response = await orpc.leaderboard.list(filter);

  return response;
}

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filter = leaderboardFilterSchema.parse(await props.searchParams);

  // Redirect to main leaderboard if user tries to access friends tab while logged out
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (filter.friend && !session) {
    redirect('/leaderboard');
  }

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

  // Helper to create URLs for tab navigation
  const createTabUri = (isFriend: boolean): string => {
    const tabParams = createSearchParamsFromSchema({
      ...filter,
      friend: isFriend || undefined,
      page: 1, // Reset to first page when switching tabs
    });

    return '/leaderboard' + (tabParams.size > 0 ? `?${tabParams}` : '');
  };

  const currentTab = filter.friend ? 'friends' : 'all';

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
                <Trophy className="text-primary h-6 w-6" />
                <CardTitle className="text-xl font-bold">
                  Global Leaderboard
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                {session && (
                  <Tabs value={currentTab} className="w-auto">
                    <TabsList>
                      <TabsTrigger value="all" asChild>
                        <Link href={createTabUri(false)}>All</Link>
                      </TabsTrigger>
                      <TabsTrigger value="friends" asChild>
                        <Link href={createTabUri(true)}>Friends</Link>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                <LeaderboardFilter filter={filter} />
              </div>
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
