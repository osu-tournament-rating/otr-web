import { Trophy } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

// Keeps the tournament list skeleton from showing for the submission form.
export default function TournamentSubmissionLoading() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-0">
      <div className="mb-8 text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
          <Trophy className="size-8" aria-hidden="true" />
          Tournament Submission
        </h1>
        <p className="mt-4 text-muted-foreground">
          Use this form to submit a new tournament for verification and
          tracking.
        </p>
        <Skeleton className="mx-auto mt-3 h-6 w-52" />
      </div>
      <Skeleton
        role="status"
        aria-label="Loading submission form"
        className="h-[59.5rem] w-full rounded-xl"
      />
    </div>
  );
}
