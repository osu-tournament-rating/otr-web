import Guidelines from '@/components/SubmitMatches/Guidelines/Guidelines';
import MatchForm from '@/components/SubmitMatches/MatchForm/MatchForm';
import { getSession } from '../actions';
import styles from './page.module.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit',
};

export default async function page() {
  const { roles } = await getSession(true);

  return (
    <main className={styles.pageContainer}>
      <Guidelines />
      <MatchForm userRoles={roles} />
    </main>
  );
}
