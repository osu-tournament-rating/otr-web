import StatusButton from '@/components/Button/StatusButton/StatusButton';
import Link from 'next/link';
import styles from './TournamentInfoContainer.module.css';
import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';

import { rulesetIcons } from '@/lib/api';
import { patchTournamentData } from '@/app/actions/tournaments';

export default function TournamentInfoContainer({
  data,
  showName = false,
  isAdminView = false,
}: {
  data: TournamentCompactDTO;
  /** Whether to show the tournament's name */
  showName?: boolean;
  /** Whether to show admin information like verification status */
  isAdminView?: boolean;
}) {
  return (
    <div className={styles.content}>
      {/** Verification Status */}
      {isAdminView && (
        <div className={styles.field} style={{ gridColumn: '1 / 3' }}>
          <StatusButton
            initialStatus={data.verificationStatus}
            isAdminView
            onChange={async (status) => {
              const updatedTournament = await patchTournamentData({
                id: data.id,
                path: 'verificationStatus',
                value: status
              });
              Object.assign(data, updatedTournament);
            }}
          />
        </div>
      )}
      {/** Name */}
      {showName && (
        <div className={styles.field} id={styles.tournamentName}>
          <div className={styles.name}>Name</div>
          <div className={styles.value}>{data.name}</div>
        </div>
      )}
      {/** Abbreviation */}
      <div className={styles.field}>
        <div className={styles.name}>Abbreviation</div>
        <div className={styles.value}>{data.abbreviation}</div>
      </div>
      {/** Format */}
      <div className={styles.field}>
        <div className={styles.name}>Format</div>
        <div className={styles.value}>
          {`${data.lobbySize}v${data.lobbySize}`}
        </div>
      </div>
      {/** Ruleset */}
      <div className={styles.field}>
        <div className={styles.name}>Ruleset</div>
        <div className={styles.value}>
          {rulesetIcons[data.ruleset].shortAlt}
        </div>
      </div>
      {/** Forum URL */}
      <div className={styles.field}>
        <div className={styles.name}>Forum post link</div>
        <div className={styles.value}>
          <Link href={data.forumUrl} target='_blank'>
            {data.forumUrl}
          </Link>
        </div>
      </div>
      {/** Submitter */}
      <div className={styles.field}>
        <div className={styles.name}>Submitter</div>
        <div className={styles.value}>
          {data.submittedByUser
            ? (
              <Link href={`/players/${data.submittedByUser.player.id}`}>
                {data.submittedByUser.player.username}
              </Link>
            )
            : ('Unknown submitter')
          }
        </div>
      </div>
      {/** Verifier */}
      <div className={styles.field}>
        <div className={styles.name}>Verifier</div>
        <div className={styles.value}>
          {data.verifiedByUser
            ? (
              <Link href={`/players/${data.verifiedByUser.player.id}`}>
                {data.verifiedByUser.player.username}
              </Link>
            )
            : ('Unknown verifier')
          }
        </div>
      </div>
    </div>
  );
}
