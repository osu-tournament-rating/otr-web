import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { Card } from '@/components/ui/card';
import { ExternalLink, Trophy } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Submit Tournament | o!TR',
  description: 'Submit a tournament to be included in the rating system',
};

export default function TournamentSubmissionPage() {
  return (
    <div className="mx-auto flex w-full flex-col items-center justify-center gap-3">
      <Card className="flex w-full flex-col items-center justify-center gap-4">
        <div className="flex flex-row items-center gap-2 text-xl font-bold text-primary md:text-2xl">
          <Trophy className="size-9" />
          Tournament Submission
        </div>
        <div className="flex flex-col items-center">
          <span className="text-md flex text-muted-foreground">
            Use this form to submit a new tournament for verification and
            tracking.
          </span>
          <Link
            href="https://docs.otr.stagec.xyz/Rating-Framework/Data-Processing/Tournament-Approval#acceptance-criteria"
            target="_blank"
            className="flex items-center text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
          >
            <ExternalLink className="mr-1 size-4" />
            Read our acceptance criteria
          </Link>
        </div>
      </Card>
      <TournamentSubmissionForm />
    </div>
  );
}
