import Guidelines from '@/components/Tournaments/Submission/Guidelines/Guidelines';
import SubmissionForm from '@/components/Tournaments/Submission/SubmissionForm/SubmissionForm';
import { getSessionData } from '../actions/session';
import styles from './page.module.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tournament Submission',
};

export default async function page() {
  const { scopes } = await getSessionData();

  return (
    <main className={styles.pageContainer}>
      <Guidelines />
      <SubmissionForm userScopes={scopes} />
    </main>
  );
}
