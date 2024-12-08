import StatusButton from '@/components/Button/StatusButton/StatusButton';
import Link from 'next/link';
import styles from './InfoContainer.module.css';
import { TournamentDTO } from '@osu-tournament-rating/otr-api-client';
import { rulesetIcons } from '@/lib/api';
import { patchTournamentData } from '@/app/actions/tournaments';

export default function InfoContainer({
  data,
  showHeader = false,
  headerText,
  isAdminView = false,
}: {
  data: TournamentDTO;
  showHeader?: boolean;
  headerText?: string;
  isAdminView?: boolean;
}) {
  return (
    <div className={styles.container}>
      {showHeader && <h1>{headerText}</h1>}
      <div className={styles.infoContainer}>
        {isAdminView && (
          <div className={styles.field} style={{ gridColumn: '1 / 3' }}>
            <StatusButton
              initialStatus={data.verificationStatus}
              isAdminView
              onChange={async (status) => {
                // if (status === VerificationStatus.Rejected) {
                //   // select rejection reason with modal
                // } else {
                //   // await patchTournamentData({
                //   //   id: data.id,
                //   //   path: 'verificationStatus',
                //   //   value: status
                //   // });
                // }
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
        <div className={styles.field}>
          <div className={styles.name}>Format</div>
          <div className={styles.value}>
            {`${data.lobbySize}v${data.lobbySize}`}
          </div>
        </div>
        <div className={styles.field}>
          <div className={styles.name}>Abbreviation</div>
          <div className={styles.value}>{data.abbreviation}</div>
        </div>
        <div className={styles.field}>
          <div className={styles.name}>Ruleset</div>
          <div className={styles.value}>
            {rulesetIcons[data.ruleset].shortAlt}
          </div>
        </div>
        {isAdminView && (
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
        )}
        <div
          className={styles.field}
          style={isAdminView ? { gridColumn: '1 / 3' } : {}}
        >
          <div className={styles.name}>Forum post link</div>
          <div className={styles.value}>
            <Link href={data.forumUrl} target='_blank'>
              {data.forumUrl}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
