'use client';

import { TournamentDTO } from '@osu-tournament-rating/otr-api-client';
import styles from './TournamentList.module.css';
import { Tooltip } from 'react-tooltip';
import { RulesetMetadata } from '@/lib/enums';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import { dateFormats } from '@/lib/dates';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import { useTournamentListFilter } from '@/components/Context/TournamentListFilterContext';
import RejectionReason from '@/components/Enums/RejectionReason';

export default function TournamentListItem({ data }: { data: TournamentDTO }) {
  const {
    filter: { verified },
  } = useTournamentListFilter();
  const rulesetMetadata = RulesetMetadata[data.ruleset];
  const RulesetIcon = rulesetMetadata.image;

  return (
    <div className={styles.listItem}>
      <div className={styles.collapsed}>
        <div className={styles.gridRow}>
          <div className={styles.nameField}>
            {/** Verification status bubble */}
            <VerificationStatusCircle
              verificationStatus={data.verificationStatus}
            />
            {/** Name */}
            <span className={styles.nameValue}>{data.name}</span>
          </div>
          {/** Lobby size */}
          <span>{`${data.lobbySize}v${data.lobbySize}`}</span>
          {/** Ruleset Icon */}
          <span>
            <div className={styles.rulesetField}>
              <RulesetIcon
                className="fill"
                data-tooltip-id={`tooltip-ruleset-${data.ruleset}`}
                data-tooltip-content={rulesetMetadata.shortAlt}
                data-tooltip-delay-show={400}
              />
              <Tooltip
                id={`tooltip-ruleset-${data.ruleset}`}
                className={styles.tooltip}
              />
            </div>
          </span>
          {/** Submitter */}
          <span>
            {data.submittedByUser?.player.username ?? 'Missing Submitter'}
          </span>
          {/** Start Date */}
          <FormattedDate
            date={data.startTime}
            format={dateFormats.tournaments.listItem}
          />
          {/** End Date */}
          <FormattedDate
            date={data.endTime}
            format={dateFormats.tournaments.listItem}
          />
        </div>
        {!verified && (
          <RejectionReason
            itemType={'tournament'}
            value={data.rejectionReason}
          />
        )}
      </div>
    </div>
  );
}

// function ExpandedContent({
//   tournament,
//   onHeaderClick,
//   onDataChanged = () => {},
// }: {
//   tournament: TournamentDTO;
//   onHeaderClick: () => void;
//   onDataChanged?: (data: TournamentDTO) => void;
// }) {
//   return (
//     <>
//       <div className={styles.header} onClick={onHeaderClick}>
//         <TournamentPageHeader
//           forumUrl={tournament.forumUrl}
//           startDate={tournament.startTime}
//           endDate={tournament.endTime}
//         >
//           <motion.h1 layoutId={`${tournament.name}-title`} layout="size">
//             {tournament.name}
//           </motion.h1>
//         </TournamentPageHeader>
//       </div>
//       <div className={styles.content}>
//         <TournamentInfoContainer
//           data={tournament}
//           showName={false}
//           onDataChanged={onDataChanged}
//         />
//         <MatchesList data={tournament.matches ?? []} />
//       </div>
//     </>
//   );
// }
