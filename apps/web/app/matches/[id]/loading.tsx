import { SkeletonText } from '@/components/kit/feedback/Skeletons';
import { DetailHero } from '@/components/kit/layout/DetailHero';
import { PageFrame } from '@/components/kit/layout/PageFrame';

import { MatchLoadingBody, MatchLoadingTabs } from './loading-views';

export default function MatchLoading() {
  return (
    <PageFrame role="status" aria-label="Loading match">
      <DetailHero
        title={<SkeletonText className="h-7 w-80 max-w-full" />}
        status={<SkeletonText className="h-6 w-24 rounded-full" />}
        meta={
          <>
            <SkeletonText className="w-44" />
            <SkeletonText className="w-48" />
            <SkeletonText className="w-20" />
          </>
        }
        actions={
          <>
            <SkeletonText className="size-8" />
            <SkeletonText className="size-8" />
            <SkeletonText className="size-8" />
          </>
        }
        tabs={<MatchLoadingTabs />}
      />
      <MatchLoadingBody />
    </PageFrame>
  );
}
