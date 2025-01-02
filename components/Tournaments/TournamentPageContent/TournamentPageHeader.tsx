import styles from './TournamentPageContent.module.css';
import Link from 'next/link';
import OutIcon from '@/public/icons/out.svg';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import { dateFormats } from '@/lib/dates';
import React from 'react';

export default function TournamentPageHeader({
  forumUrl,
  startDate,
  endDate,
  children,
}: {
  forumUrl: string;
  startDate: Date | string;
  endDate: Date | string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.header}>
      <span>
        {children}
        <Link href={forumUrl}>
          <OutIcon className={styles.outIcon} />
        </Link>
      </span>
      <span>
        <FormattedDate
          className={styles.date}
          date={startDate}
          format={dateFormats.tournaments.header}
        />
        <span>to</span>
        <FormattedDate
          className={styles.date}
          date={endDate}
          format={dateFormats.tournaments.header}
        />
      </span>
    </div>
  );
}
