import { fetchMatchPage } from '@/app/actions';
import InfoContainer from '@/components/Tournaments/InfoContainer/InfoContainer';
import { dateFormatOptions } from '@/lib/types';
import linkIcon from '@/public/icons/out.svg';
import Image from 'next/image';
import styles from './page.module.css';

export default async function page({
  params: { id },
}: {
  params: { id: string | number };
}) {
  const matchData = await fetchMatchPage(id);

  console.log(matchData);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span>Missing</span>
            <span className={styles.score}>6 - 1</span>
            <span>Missing</span>
            {/* <span className={styles.icon}>
              <Image src={linkIcon} alt="link icon" fill />
            </span> */}
          </h1>
          <div className={styles.date}>
            {new Date(matchData?.startTime).toLocaleDateString(
              'en-US',
              dateFormatOptions.tournaments.header
            )}
          </div>
        </div>
        <InfoContainer
          data={matchData}
          headerText={'Tournament information'}
          showHeader={true}
        />
      </div>
    </main>
  );
}
