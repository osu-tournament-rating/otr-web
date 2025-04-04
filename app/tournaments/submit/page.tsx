import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { TrophyIcon } from 'lucide-react';

export default function TournamentSubmissionPage() {
  return (
    <div className="container py-12 relative">
      <div className="max-w-6xl mx-auto bg-card/90 p-8 rounded-xl shadow-lg border border-border/50">
        <TournamentSubmissionForm />
      </div>
    </div>
  );
}
