'use client';

import styles from './TournamentList.module.css';
import clsx from 'clsx';

export default function TournamentListHeader() {

  return (
    <div className={clsx(
      styles.row,
      styles.collapsed,
      styles.headings
    )}>
      <span>Name</span>
      <span>Format</span>
      <span>Ruleset</span>
      <span>Submitter</span>
      <span>Start Date</span>
      <span>End Date</span>
    </div>
  );
}