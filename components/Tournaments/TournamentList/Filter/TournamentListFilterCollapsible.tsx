'use client';

import styles from './TournamentListFilter.module.css';
import { AnimationProps, motion } from 'framer-motion';
import clsx from 'clsx';

// TODO: Clean up this animation
const collapsibleAnimationProps: AnimationProps = {
  initial: {
    height: 0,
    opacity: 0,
    gap: 0,
    padding: '0 2rem',
    overflow: 'hidden',
  },
  animate: {
    height: 'auto',
    opacity: 1,
    gap: 'var(--internal-gap)',
    padding: '1.2rem 2rem',
    overflow: 'hidden'
  },
  exit: {
    height: 0,
    opacity: 0,
    gap: 0,
    padding: '0 2rem',
    overflow: 'hidden',
  }
}

export default function TournamentListFilterCollapsible() {
  return (
    <motion.div
      className={clsx('content', styles.collapsible)}
      {...collapsibleAnimationProps}
    >
      <h1>tons of shit</h1>
      <h1>tons of shit</h1>
      <h1>tons of shit</h1>
      <h1>tons of shit</h1>
    </motion.div>
  );
}