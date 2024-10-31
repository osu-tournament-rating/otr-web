import Guidelines from '@/components/SubmitMatches/Guidelines/Guidelines';
import MatchForm from '@/components/SubmitMatches/MatchForm/MatchForm';
import { getSessionData } from '../actions/session';
import styles from './page.module.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit',
};

export default async function page() {
  const { scopes } = await getSessionData();

  return (
    <main className={styles.pageContainer}>
      <Guidelines />
      <MatchForm userScopes={scopes} />
    </main>
  );
}
