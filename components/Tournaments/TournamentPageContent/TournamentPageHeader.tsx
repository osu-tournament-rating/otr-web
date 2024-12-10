import styles from './TournamentPageContent.module.css';
import Link from 'next/link';
import OutIcon from '@/public/icons/out.svg';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import { dateFormats } from '@/lib/dates';
import React from 'react';

export default function TournamentPageHeader({
  forumUrl,
  date,
  children
}: {
  forumUrl: string;
  date: Date | string;
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
      <FormattedDate
        className={styles.date}
        date={date}
        format={dateFormats.tournaments.header}
      />
    </div>
  );
}