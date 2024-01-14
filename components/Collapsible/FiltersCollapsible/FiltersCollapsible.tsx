'use client';
import {
  applyLeaderboardFilters,
  resetLeaderboardFilters,
} from '@/app/actions';
import InfoIcon from '@/components/Form/InfoIcon/InfoIcon';
import RangeSlider from '@/components/Range/RangeSlider';
import TierSelector from '@/components/TierSelector/TierSelector';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useTransition } from 'react';
import styles from './FiltersCollapsible.module.css';

export default function FiltersCollapsible({
  params,
  isCollapsibleOpen,
  data,
}: {
  params: {};
  isCollapsibleOpen: boolean;
  data: {};
}) {
  const { type, rank, rating, matches, winrate, inclTier, exclTier } = params;

  const [paramsToPush, setParamsToPush] = useState({});

  let [isPending, startTransition] = useTransition();

  const resetFilter = () => {
    let string = `/leaderboards?${type != null ? `type=${type}` : ''}`;

    return resetLeaderboardFilters(string);
  };

  useEffect(() => {
    setParamsToPush({
      ...params,
      inclTier: inclTier != null ? inclTier : [],
      exclTier: exclTier != null ? exclTier : [],
      rank: rank != null ? rank : [],
      rating: rating != null ? rating : [],
      matches: matches != null ? matches : [],
      winrate: winrate != null ? winrate : [],
    });
  }, [params]);

  const collapsible = {
    initial: {
      gap: 0,
      padding: '0vw 2vw',
    },
    animate: {
      gap: '2rem',
      padding: '2vw 2vw',
      transition: {
        duration: 0.5,
        ease: 'easeOut',
        animation: 'stagger',
        staggerChildren: 0.2,
      },
    },
    exit: {
      padding: '0vw 2vw',
      gap: 0,
      transition: {
        duration: 0.5,
        animation: 'afterChildren',
      },
    },
  };

  const collapsibleContent = {
    initial: {
      overflow: 'hidden',
      opacity: 0,
      height: 0,
    },
    animate: {
      overflow: 'hidden',
      opacity: 1,
      height: 'auto',
      transition: {
        duration: 0.4,
        animation: 'stagger',
        staggerChildren: 0.5,
      },
    },
    exit: {
      overflow: 'hidden',
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <AnimatePresence>
      {isCollapsibleOpen && (
        <motion.div
          variants={collapsible}
          initial="initial"
          animate="animate"
          exit="exit"
          className={styles.collapsible}
        >
          <motion.div variants={collapsibleContent} className={styles.filters}>
            <motion.div className={styles.filter}>
              <div className={styles.filterName}>
                <h2>Rank</h2>
                <InfoIcon
                  infoText="Filter by the last-known osu! rank of the player"
                  positionBottom={true}
                  startLeft={true}
                />
              </div>
              <RangeSlider
                name={'rank'}
                max={data.maxRank}
                value={rank}
                setParamsToPush={setParamsToPush}
              />
            </motion.div>
            <motion.div className={styles.filter}>
              <h2>Rating</h2>
              <RangeSlider
                name={'rating'}
                min={100}
                max={Math.floor(data.maxRating)}
                value={rating}
                setParamsToPush={setParamsToPush}
              />
            </motion.div>
            <motion.div className={styles.filter}>
              <h2>Matches</h2>
              <RangeSlider
                name={'matches'}
                max={data.maxMatches}
                value={matches}
                setParamsToPush={setParamsToPush}
              />
            </motion.div>
            <motion.div className={styles.filter}>
              <h2>Winrate</h2>
              <RangeSlider
                name={'winrate'}
                max={100}
                value={winrate}
                setParamsToPush={setParamsToPush}
              />
            </motion.div>
            <motion.div className={styles.filter}>
              <h2>Tier</h2>
              <TierSelector
                value={{ inclTier, exclTier }}
                setParamsToPush={setParamsToPush}
              />
            </motion.div>
          </motion.div>
          <motion.div variants={collapsibleContent} className={styles.buttons}>
            <div
              onClick={() =>
                startTransition(() => {
                  applyLeaderboardFilters(paramsToPush);
                })
              }
              className={styles.save}
            >
              Apply filters
            </div>
            <div onClick={resetFilter}>Reset all filters</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
