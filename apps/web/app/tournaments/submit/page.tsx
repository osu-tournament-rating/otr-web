import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { ExternalLink, Trophy } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Submit Tournament | o!TR',
  description: 'Submit a tournament to be included in the rating system',
};

export default async function TournamentSubmissionPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-0">
      <div className="mb-8 text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
          <Trophy className="size-8" />
          Tournament Submission
        </h1>
        <p className="mt-4 text-muted-foreground">
          Use this form to submit a new tournament for verification and
          tracking.
        </p>
        <Link
          href="https://docs.otr.stagec.xyz/Rating-Framework/Data-Processing/Tournament-Approval#acceptance-criteria"
          target="_blank"
          className="mt-3 inline-flex items-center text-sm text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
        >
          <ExternalLink className="mr-1 size-4" />
          Read our acceptance criteria
        </Link>
      </div>
      <TournamentSubmissionForm />
    </div>
  );
}
