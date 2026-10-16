import { Database, ExternalLink, Trophy } from 'lucide-react';

import {
  ACCEPTANCE_CRITERIA_URL,
  SUBMISSION_DESCRIPTION,
  SUBMISSION_TITLE,
} from '@/app/tournaments/submit/copy';
import { Button } from '@/components/kit/controls/Button';
import {
  PanelSkeleton,
  SectionHeaderSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { cn } from '@/lib/utils';

/** A label and its input as bars, the height of a loaded field. */
function FieldSkeleton({ input = 'h-9' }: { input?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <SkeletonText className="block h-5 w-28" />
      <SkeletonText className={cn('block w-full', input)} />
    </div>
  );
}

// Keeps the tournament list skeleton from showing for the submission form.
export default function TournamentSubmissionLoading() {
  return (
    <PageFrame>
      <PageHeader
        icon={Trophy}
        title={SUBMISSION_TITLE}
        description={SUBMISSION_DESCRIPTION}
        actions={
          <Button asChild variant="outline" icon={ExternalLink}>
            <a
              href={ACCEPTANCE_CRITERIA_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read our acceptance criteria
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        }
      />
      <PanelSkeleton label="Loading submission form">
        <SectionHeaderSkeleton icon={Trophy} title="Information" meta={false} />
        <div className="flex flex-col gap-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <SkeletonText className="block h-5 w-44" />
        </div>
        <SectionHeaderSkeleton
          icon={Database}
          title="Data"
          meta={false}
          className="border-t"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <FieldSkeleton input="h-32" />
          <FieldSkeleton input="h-32" />
        </div>
        <div className="flex justify-end gap-2 border-t bg-muted/30 px-4 py-3">
          <SkeletonText className="block h-9 w-20" />
          <SkeletonText className="block h-9 w-36" />
        </div>
      </PanelSkeleton>
    </PageFrame>
  );
}
