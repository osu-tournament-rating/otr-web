import Guidelines from '@/components/Tournaments/Submission/Guidelines/Guidelines';
import SubmissionForm from '@/components/Tournaments/Submission/SubmissionForm/SubmissionForm';
import styles from './page.module.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tournament Submission',
};

export default async function Page() {
  return (
    <div className={styles.page}>
      <Guidelines />
      <SubmissionForm />
    </div>
  );
}
