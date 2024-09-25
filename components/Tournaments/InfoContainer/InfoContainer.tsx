import { modeIcons } from '@/lib/types';
import Link from 'next/link';
import styles from './InfoContainer.module.css';

export default function InfoContainer({
  data,
  showHeader = false,
  headerText,
}: {
  data: {};
  showHeader?: boolean;
  headerText?: string;
}) {
  return (
    <div className={styles.container}>
      {showHeader && <h1>{headerText}</h1>}
      <div className={styles.infoContainer}>
        <div className={styles.field}>
          <div className={styles.name}>Format</div>
          <div
            className={styles.value}
          >{`${data?.lobbySize}v${data?.lobbySize}`}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.name}>Abbreviation</div>
          <div className={styles.value}>{data?.abbreviation}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.name}>Ruleset</div>
          <div className={styles.value}>
            {modeIcons[data?.ruleset]?.altTournamentsList}
          </div>
        </div>
        <div className={styles.field}>
          <div className={styles.name}>Forum post link</div>
          <div className={styles.value}>
            <Link
              href={data?.forumUrl ?? ''}
              alt={'Forum Post'}
              target="_blank"
            >
              {data?.forumUrl}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
