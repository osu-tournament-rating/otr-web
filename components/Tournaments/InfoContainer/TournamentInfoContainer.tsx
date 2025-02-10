import Link from 'next/link';
import styles from './TournamentInfoContainer.module.css';
import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import { RulesetEnumHelper } from '@/lib/enums';
import clsx from 'clsx';
import RejectionReason from '@/components/Enums/RejectionReason';

export default function TournamentInfoContainer({
  data,
}: {
  /** Tournament data */
  data: TournamentCompactDTO;
}) {
  return (
    <div className={styles.content}>
      <div className={clsx(styles.field, styles.single)}>
        <RejectionReason itemType={'tournament'} value={data.rejectionReason} />
      </div>
      <div className={styles.field}>
        <div className={styles.name}>Abbreviation</div>
        <div className={styles.value}>{data.abbreviation}</div>
      </div>
      <div className={styles.field}>
        <div className={styles.name}>Format</div>
        <div
          className={styles.value}
        >{`${data.lobbySize}v${data.lobbySize}`}</div>
      </div>
      <div className={styles.field}>
        <div className={styles.name}>Ruleset</div>
        <div className={styles.value}>
          {RulesetEnumHelper.getMetadata(data.ruleset).text}
        </div>
      </div>
      <div className={styles.field}>
        <div className={styles.name}>Forum Post</div>
        <div className={styles.value}>
          <Link href={data.forumUrl} target="_blank">
            {data.forumUrl}
          </Link>
        </div>
      </div>
      {/** Submitter */}
      <div className={styles.field}>
        <div className={styles.name}>Submitter</div>
        <div className={styles.value}>
          {data.submittedByUser ? (
            <Link href={`/players/${data.submittedByUser.player.id}`}>
              {data.submittedByUser.player.username}
            </Link>
          ) : (
            'Unknown submitter'
          )}
        </div>
      </div>
      {/** Verifier */}
      <div className={styles.field}>
        <div className={styles.name}>Verifier</div>
        <div className={styles.value}>
          {data.verifiedByUser ? (
            <Link href={`/players/${data.verifiedByUser.player.id}`}>
              {data.verifiedByUser.player.username}
            </Link>
          ) : (
            'Unknown verifier'
          )}
        </div>
      </div>
    </div>
  );
}
