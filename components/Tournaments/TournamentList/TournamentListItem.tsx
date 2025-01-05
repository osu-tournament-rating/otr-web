'use client';

import { TournamentDTO } from '@osu-tournament-rating/otr-api-client';
import styles from './TournamentList.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { RulesetMetadata } from '@/lib/enums';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import { dateFormats } from '@/lib/dates';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import TournamentPageHeader from '@/components/Tournaments/TournamentPageContent/TournamentPageHeader';
import { useTournamentListFilter } from '@/components/Context/TournamentListFilterContext';
import TournamentRejectionReason from '@/components/RejectionReason/TournamentRejectionReason';
import TournamentInfoContainer from '../InfoContainer/TournamentInfoContainer';
import MatchesList from '@/components/Matches/List/MatchesList';

export default function TournamentListItem({
  data,
  isExpanded,
  onClick,
  onDataChanged = () => {},
}: {
  data: TournamentDTO;
  isExpanded: boolean;
  onClick: () => void;
  onDataChanged?: (data: TournamentDTO) => void;
}) {
  return (
    <AnimatePresence>
      <motion.div className={styles.listItem}>
        {isExpanded ? (
          // Expanded: Shows tournament page content
          <motion.div className={styles.expanded}>
            <ExpandedContent
              tournament={data}
              onHeaderClick={onClick}
              onDataChanged={onDataChanged}
            />
          </motion.div>
        ) : (
          // Collapsed: Shows basic information in row format
          <motion.div className={styles.collapsed} onClick={onClick}>
            <CollapsedContent tournament={data} />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ExpandedContent({
  tournament,
  onHeaderClick,
  onDataChanged = () => {},
}: {
  tournament: TournamentDTO;
  onHeaderClick: () => void;
  onDataChanged?: (data: TournamentDTO) => void;
}) {
  return (
    <>
      <div className={styles.header} onClick={onHeaderClick}>
        <TournamentPageHeader
          forumUrl={tournament.forumUrl}
          startDate={tournament.startTime}
          endDate={tournament.endTime}
        >
          <motion.h1 layoutId={`${tournament.name}-title`} layout="size">
            {tournament.name}
          </motion.h1>
        </TournamentPageHeader>
      </div>
      <div className={styles.content}>
        <TournamentInfoContainer
          data={tournament}
          showName={false}
          onDataChanged={onDataChanged}
        />
        <MatchesList data={tournament.matches ?? []} />
      </div>
    </>
  );
}

function CollapsedContent({ tournament }: { tournament: TournamentDTO }) {
  const {
    filter: { verified },
  } = useTournamentListFilter();
  const rulesetMetadata = RulesetMetadata[tournament.ruleset];
  const RulesetIcon = rulesetMetadata.image;

  return (
    <>
      <div className={styles.gridRow}>
        <div className={styles.nameField}>
          {/** Verification status bubble */}
          <VerificationStatusCircle
            verificationStatus={tournament.verificationStatus}
          />
          {/** Name */}
          <motion.span
            className={styles.nameValue}
            layoutId={`${tournament.name}-title`}
            layout="size"
          >
            {tournament.name}
          </motion.span>
        </div>
        {/** Lobby size */}
        <span>{`${tournament.lobbySize}v${tournament.lobbySize}`}</span>
        {/** Ruleset Icon */}
        <span>
          <div className={styles.rulesetField}>
            <RulesetIcon
              className="fill"
              data-tooltip-id={`tooltip-ruleset-${tournament.ruleset}`}
              data-tooltip-content={rulesetMetadata.shortAlt}
              data-tooltip-delay-show={400}
            />
            <Tooltip
              id={`tooltip-ruleset-${tournament.ruleset}`}
              className={styles.tooltip}
            />
          </div>
        </span>
        {/** Submitter */}
        <span>
          {tournament.submittedByUser?.player.username ?? 'Missing Submitter'}
        </span>
        {/** Start Date */}
        <FormattedDate
          date={tournament.startTime}
          format={dateFormats.tournaments.listItem}
        />
        {/** End Date */}
        <FormattedDate
          date={tournament.endTime}
          format={dateFormats.tournaments.listItem}
        />
      </div>
      {!verified && (
        <TournamentRejectionReason
          rejectionReason={tournament.rejectionReason}
        />
      )}
    </>
  );
}
