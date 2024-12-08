'use client';

import { fetchTournamentPage } from '@/app/actions';
import StatusButton from '@/components/Button/StatusButton/StatusButton';
import {
  dateFormatOptions,
  statusButtonTypes,
} from '@/lib/types';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import InfoContainer from '../InfoContainer/InfoContainer';
import parentStyles from '../Lists/Lists.module.css';
import SimpleExpandableRow from '../SimpleExpandableRow/SimpleExpandableRow';
import styles from './MainExpandableRow.module.css';
import { rulesetIcons } from '@/lib/api';

export default function MainExpandableRow({ tournament }: { tournament: {} }) {
  const [expanded, setExpanded] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  const format = `${tournament?.lobbySize}v${tournament?.lobbySize}`;
  const IconComponent = rulesetIcons[tournament?.ruleset]?.image;
  const status = tournament?.verificationStatus;

  const handleToggle = async () => {
    setExpanded(true);

    if (!expanded && !fetchedData && tournament) {
      setFetchLoading(true);
      try {
        const expandedData = await fetchTournamentPage(tournament.id);
        setFetchedData(expandedData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setFetchLoading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className={!expanded ? parentStyles.row : styles.expandedRow}
        onClick={() => !expanded && handleToggle()}
        style={{ cursor: !expanded ? 'pointer' : 'default' }}
      >
        {!expanded ? (
          <>
            <div className={parentStyles.infoName}>
              <span
                className={clsx(
                  parentStyles.status,
                  parentStyles[statusButtonTypes[status]?.className]
                )}
              />
              <motion.span
                layout="preserve-aspect"
                layoutId={`${tournament.name}-title`}
                className={parentStyles.name}
              >
                {tournament.name}
              </motion.span>
            </div>
            <span>{format}</span>
            <span>
              <div className={parentStyles.rulesetIcon}>
                <Tooltip
                  id={`tooltip-${tournament.ruleset}`}
                  style={{
                    padding: '0.6em 1.2em',
                    borderRadius: '0.6em',
                    fontWeight: '500',
                    background: 'hsl(0,0%,82%)',
                    color: '#333',
                  }}
                />
                {IconComponent && (
                  <IconComponent
                    className="fill"
                    data-tooltip-id={`tooltip-${tournament.ruleset}`}
                    data-tooltip-content={
                      rulesetIcons[tournament.ruleset]?.altTournamentsList
                    }
                    data-tooltip-delay-show={400}
                  />
                )}
              </div>
            </span>
            <span>Missing Submitter</span>
            <span>
              {new Date(tournament.startTime).toLocaleDateString(
                'en-US',
                dateFormatOptions.tournaments.listItem
              )}
            </span>
          </>
        ) : (
          <ExpandedRow
            tournament={tournament}
            fetchedData={fetchedData}
            setExpanded={setExpanded}
            fetchLoading={fetchLoading}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const ExpandedRow = ({
  tournament,
  fetchedData,
  setExpanded,
  fetchLoading,
}: {
  tournament: any;
  fetchedData: any;
  setExpanded: any;
  fetchLoading: boolean;
}) => {
  console.log(fetchedData);

  return (
    <>
      <div className={styles.header} onClick={() => setExpanded(false)}>
        <motion.h1
          layout="preserve-aspect"
          layoutId={`${tournament?.name}-title`}
          className={styles.title}
        >
          {tournament?.name}
        </motion.h1>
        <div className={styles.date}>
          {new Date(tournament?.startTime).toLocaleDateString(
            'en-US',
            dateFormatOptions.tournaments.header
          )}
        </div>
      </div>
      <div className={styles.content}>
        <InfoContainer data={tournament} isAdminView={true} />
        {!fetchLoading ? (
          <div className={styles.matchesList}>
            {fetchedData?.matches.map((match, index) => {
              return (
                <SimpleExpandableRow key={index}>
                  <span id="matchName">{match.name}</span>
                  <StatusButton
                    initialStatus={match.verificationStatus}
                    isAdminView
                  />
                </SimpleExpandableRow>
              );
            })}
          </div>
        ) : (
          <>Loading</>
        )}
      </div>
    </>
  );
};
