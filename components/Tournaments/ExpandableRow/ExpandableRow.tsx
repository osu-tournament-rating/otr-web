'use client';

import { dateFormatOptions, modeIcons, statusButtonTypes } from '@/lib/types';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import parentStyles from '../Lists/Lists.module.css';
import styles from './ExpandableRow.module.css';

export default function ExpandableRow({ tournament }: { tournament: {} }) {
  const [expanded, setExpanded] = useState(false);

  const format = `${tournament?.lobbySize}v${tournament?.lobbySize}`;
  const IconComponent = modeIcons[tournament?.ruleset]?.image;
  const status = tournament?.processingStatus;

  return (
    <AnimatePresence>
      <motion.div
        className={!expanded ? parentStyles.row : styles.expandedRow}
        onClick={() => setExpanded((prev) => !prev)}
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
                layout="position"
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
                      modeIcons[tournament.ruleset]?.altTournamentsList
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
          <>
            <div className={styles.header}>
              <motion.div
                layoutId={`${tournament.name}-title`}
                style={{ fontSize: '4rem' }}
              >
                ciao
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
