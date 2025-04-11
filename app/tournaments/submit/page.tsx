import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit Tournament | o!TR',
  description: 'Submit a tournament to be included in the rating system',
};

export default function TournamentSubmissionPage() {
  return (
    <div className="relative container mx-auto flex w-full items-center justify-center bg-muted/30 px-6 py-12 md:px-12 xl:px-24 dark:bg-muted/10">
      <TournamentSubmissionForm />
    </div>
  );
}
