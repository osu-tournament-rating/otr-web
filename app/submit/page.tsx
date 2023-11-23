import Guidelines from '@/components/SubmitMatches/Guidelines/Guidelines';
import MatchForm from '@/components/SubmitMatches/MatchForm/MatchForm';
import { getUserData } from '../actions';
import styles from './page.module.css';

export default async function page() {
  const { roles } = await getUserData();

  return (
    <main className={styles.pageContainer}>
      <Guidelines />
      <MatchForm userRoles={roles} />
    </main>
  );
}
