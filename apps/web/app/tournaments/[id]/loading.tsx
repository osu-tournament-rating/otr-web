import { SkeletonText } from '@/components/kit/feedback/Skeletons';
import { DetailHero } from '@/components/kit/layout/DetailHero';
import { PageFrame } from '@/components/kit/layout/PageFrame';

import { TournamentLoadingBody, TournamentLoadingTabs } from './loading-views';

export default function TournamentLoading() {
  return (
    <PageFrame role="status" aria-label="Loading tournament">
      <DetailHero
        title={<SkeletonText className="h-7 w-80 max-w-full" />}
        status={<SkeletonText className="h-6 w-24 rounded-full" />}
        meta={
          <>
            <SkeletonText className="w-14" />
            <SkeletonText className="w-10" />
            <SkeletonText className="w-20" />
            <SkeletonText className="w-40" />
          </>
        }
        // Report, audit history and the osu! forum post, as loaded.
        actions={
          <>
            <SkeletonText className="size-8" />
            <SkeletonText className="size-8" />
            <SkeletonText className="size-8" />
          </>
        }
        tabs={<TournamentLoadingTabs />}
      />
      <TournamentLoadingBody />
    </PageFrame>
  );
}
