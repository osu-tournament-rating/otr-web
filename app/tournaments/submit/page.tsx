import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { Card } from '@/components/ui/card';
import { ExternalLink, Trophy } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Submit Tournament | o!TR',
  description: 'Submit a tournament to be included in the rating system',
};

export default async function TournamentSubmissionPage() {
  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 md:gap-2 md:px-0">
      <Card className="flex flex-col items-center justify-center gap-3 px-4 py-6 sm:gap-4 sm:px-6">
        <div className="flex flex-row items-center gap-2 text-lg font-bold text-primary sm:text-xl md:text-2xl">
          <Trophy className="size-7 sm:size-8 md:size-9" />
          Tournament Submission
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-sm text-muted-foreground sm:text-base">
            Use this form to submit a new tournament for verification and
            tracking.
          </span>
          <Link
            href="https://docs.otr.stagec.xyz/Rating-Framework/Data-Processing/Tournament-Approval#acceptance-criteria"
            target="_blank"
            className="mt-1 flex items-center text-sm text-primary underline underline-offset-4 transition-colors hover:text-primary/80 sm:text-base"
          >
            <ExternalLink className="mr-1 size-3.5 sm:size-4" />
            Read our acceptance criteria
          </Link>
        </div>
      </Card>
      <TournamentSubmissionForm />
    </div>
  );
}
