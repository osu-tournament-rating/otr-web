'use client';

import Tooltip from '@/components/Tooltip/Tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import styles from './InlineChart.module.css';

export default function InlineChart({
  won,
  lost,
  played,
}: {
  won: number;
  lost: number;
  played: number;
}) {
  /* const wonPercentage = (((played - lost) / played) * 100).toFixed(1);
  const lostPercentage = (((played - won) / played) * 100).toFixed(1); */
  const wonPercentage = 3;
  const lostPercentage = 97;

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={styles.chart}>
      <div className={styles.line}>
        <motion.div
          className={styles.segment}
          onHoverStart={() => {
            wonPercentage < 5 ? setShowTooltip(true) : setShowTooltip(false);
          }}
          onHoverEnd={() => setShowTooltip(false)}
          style={{
            width: `${wonPercentage}%`,
            borderRadius:
              wonPercentage >= 100 ? '0.75rem' : '0.75rem 0 0 0.75rem',
            backgroundColor: 'hsla(var(--green-400))',
          }}
        >
          <AnimatePresence initial={true}>
            {showTooltip && <Tooltip>Hello</Tooltip>}
          </AnimatePresence>
          {wonPercentage >= 5 && (
            <>
              <span className={styles.percentile}>{wonPercentage}</span>
              <span className={styles.label}>{won} won</span>
            </>
          )}
        </motion.div>
        <motion.div
          className={styles.segment}
          onHoverStart={() => {
            lostPercentage < 5 ? setShowTooltip(true) : setShowTooltip(false);
          }}
          onHoverEnd={() => setShowTooltip(false)}
          style={{
            width: `${lostPercentage}%`,
            borderRadius:
              lostPercentage >= 100 ? '0.75rem' : '0 0.75rem 0.75rem 0',
            backgroundColor: 'hsla(var(--red-400))',
          }}
        >
          {lostPercentage >= 5 && (
            <>
              <span className={styles.percentile}>{lostPercentage}</span>
              <span className={styles.label}>{lost} lost</span>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
