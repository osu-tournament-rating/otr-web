'use client';

import {
  TournamentCompactDTO,
  TournamentDTO,
} from '@osu-tournament-rating/otr-api-client';
import styles from './TournamentList.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { RulesetMetadata } from '@/lib/enums';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import { dateFormats } from '@/lib/dates';
import VerificationStatusCircle from '@/components/Tournaments/VerificationStatusCircle/VerificationStatusCircle';
import TournamentPageContent from '@/components/Tournaments/TournamentPageContent/TournamentPageContent';
import TournamentPageHeader from '@/components/Tournaments/TournamentPageContent/TournamentPageHeader';
import { useTournamentListFilter } from '@/components/Context/TournamentListFilterContext/TournamentListDataContext';
import TournamentRejectionReason from '@/components/Tournaments/TournamentPageContent/TournamentRejectionReason/TournamentRejectionReason';

export default function TournamentListItem({
  tournament,
  isExpanded,
  onClick,
}: {
  tournament: TournamentCompactDTO | TournamentDTO;
  isExpanded: boolean;
  onClick: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div className={styles.listItem}>
        {isExpanded ? (
          // Expanded: Shows tournament page content
          <motion.div className={styles.expanded}>
            <div className={styles.header} onClick={onClick}>
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
              <TournamentPageContent tournament={tournament} />
            </div>
          </motion.div>
        ) : (
          // Collapsed: Shows basic information in row format
          <motion.div className={styles.collapsed} onClick={onClick}>
            <CollapsedContent tournament={tournament} />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function CollapsedContent({
  tournament,
}: {
  tournament: TournamentCompactDTO;
}) {
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
