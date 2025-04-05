import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit Tournament | o!TR',
  description: 'Submit a tournament to be included in the rating system',
};

export default function TournamentSubmissionPage() {
  return (
    <div className="relative container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 -z-10 bg-muted/30 dark:bg-muted/10"></div>

      <div className="mx-auto w-full max-w-4xl">
        <TournamentSubmissionForm />
      </div>
    </div>
  );
}
