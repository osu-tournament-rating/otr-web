import { ExternalLink, Trophy } from 'lucide-react';
import { Metadata } from 'next';

import {
  ACCEPTANCE_CRITERIA_URL,
  SUBMISSION_DESCRIPTION,
  SUBMISSION_TITLE,
} from '@/app/tournaments/submit/copy';
import { Button } from '@/components/kit/controls/Button';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import TournamentSubmissionForm from '@/components/tournaments/TournamentSubmissionForm';

export const metadata: Metadata = {
  title: 'Submit a tournament',
  description: 'Submit a tournament to be included in the rating system',
};

export default function TournamentSubmissionPage() {
  return (
    <PageFrame>
      <PageHeader
        icon={Trophy}
        title={SUBMISSION_TITLE}
        description={SUBMISSION_DESCRIPTION}
        actions={
          <Button asChild variant="outline" icon={ExternalLink}>
            <a
              href={ACCEPTANCE_CRITERIA_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read our acceptance criteria
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        }
      />
      <TournamentSubmissionForm />
    </PageFrame>
  );
}
