import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { TrophyIcon } from 'lucide-react';

export default function TournamentSubmissionPage() {
  return (
    <div className="container py-8 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none -z-10" />
      <TournamentSubmissionForm />
    </div>
  );
}
