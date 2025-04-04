import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';

export default function TournamentSubmissionPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-4 text-3xl font-bold">Submit Tournament</h1>
      <p className="mb-6 text-muted-foreground">
        Use this form to submit a new tournament for verification and tracking.
      </p>
      <TournamentSubmissionForm />
    </div>
  );
}
