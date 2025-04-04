import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { TrophyIcon } from 'lucide-react';

export default function TournamentSubmissionPage() {
  return (
    <div className="container py-12 relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 -z-10 bg-muted/30 dark:bg-muted/10"></div>
      
      <div className="w-full max-w-4xl mx-auto">
        <TournamentSubmissionForm />
      </div>
    </div>
  );
}
