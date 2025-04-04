import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';
import { TrophyIcon } from 'lucide-react';

export default function TournamentSubmissionPage() {
  return (
    <div className="container py-12 relative min-h-[calc(100vh-4rem)] flex items-center justify-center">
      {/* Background pattern */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_500px_at_50%_200px,var(--primary-foreground)_5%,transparent_80%)] dark:bg-[radial-gradient(circle_500px_at_50%_200px,var(--primary)_2%,transparent_70%)] opacity-20"></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 -z-10 bg-grid-primary/[0.02] [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
      
      <div className="w-full max-w-6xl mx-auto">
        <TournamentSubmissionForm />
      </div>
    </div>
  );
}
