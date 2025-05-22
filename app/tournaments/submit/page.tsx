import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { ExternalLink, Trophy } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Submit Tournament | o!TR',
  description: 'Submit a tournament to be included in the rating system',
};

export default function TournamentSubmissionPage() {
  return (
    <div className="container relative mx-auto flex w-full flex-col items-center justify-center px-6 py-12 md:px-12 xl:px-24">
      <div className="mb-8 flex flex-col items-center text-center">
        <h1 className="text-primary mb-3 flex items-center justify-center gap-2 text-xl font-bold md:text-3xl">
          <Trophy className="size-9" />
          Tournament Submission
        </h1>
        <span className="text-md text-muted-foreground">
          Use this form to submit a new tournament for verification and
          tracking.
        </span>
        <Link
          href="https://docs.otr.stagec.xyz/tournament-approval.html#acceptance-criteria"
          target="_blank"
          className="text-primary hover:text-primary/80 mt-3 inline-flex items-center underline underline-offset-4 transition-colors"
        >
          <ExternalLink className="mr-1 size-4" />
          Read our acceptance criteria
        </Link>
      </div>
      <TournamentSubmissionForm />
    </div>
  );
}
