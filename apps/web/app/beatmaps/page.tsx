import { Metadata } from 'next';
import { Music } from 'lucide-react';
import { redirect } from 'next/navigation';

import BeatmapListContent from '@/components/beatmaps/list/BeatmapListContent';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { Panel } from '@/components/kit/layout/Panel';
import { PaginationFooter } from '@/components/kit/tables/PaginationFooter';
import {
  BEATMAP_LIST_PAGE_SIZE,
  BEATMAP_LIST_PARAMS,
  beatmapListHref,
  toBeatmapListRequest,
} from '@/lib/beatmaps/list-params';
import { countActiveFilters, parseListState } from '@/lib/kit/lists/params';
import { orpc } from '@/lib/orpc/orpc';

export const metadata: Metadata = {
  title: 'Beatmaps',
  description: 'Browse tournament beatmaps and observed play data.',
};

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const state = parseListState(BEATMAP_LIST_PARAMS, await props.searchParams);
  const data = await orpc.beatmaps.list(toBeatmapListRequest(state));

  const lastPage = Math.max(1, data.totalPages);
  if (state.page > lastPage) redirect(beatmapListHref(state, lastPage));

  const isFiltered =
    state.q !== '' ||
    state.ruleset.length > 0 ||
    countActiveFilters(BEATMAP_LIST_PARAMS, state) > 0;

  return (
    <PageFrame>
      <PageHeader
        icon={Music}
        title="Beatmaps"
        description="Tournament maps and observed play data."
      />

      <Panel aria-label="Beatmap listing" data-testid="beatmap-results">
        <BeatmapListContent
          beatmaps={data.items}
          isFiltered={isFiltered}
          totalCount={data.totalCount}
        />
        <PaginationFooter
          data-testid="beatmap-pagination"
          label="Beatmap pages"
          page={state.page}
          pageSize={BEATMAP_LIST_PAGE_SIZE}
          totalCount={data.totalCount}
          getPageHref={(page) => beatmapListHref(state, page)}
        />
      </Panel>
    </PageFrame>
  );
}
