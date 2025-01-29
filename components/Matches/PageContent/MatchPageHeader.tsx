'use client';

import styles from './MatchPageHeader.module.css';
import Link from 'next/link';
import OutIcon from '@/public/icons/out.svg';
import EditIcon from '@/public/icons/Edit.svg';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import { dateFormats } from '@/lib/dates';
import React, { useState } from 'react';
import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import { isAdmin } from '@/lib/api';
import { useUser } from '@/util/hooks';
import Modal from '@/components/Modal/Modal';
import MatchAdminView from '@/components/Matches/AdminView/MatchAdminView';

export default function MatchPageHeader({ data }: { data: MatchDTO }) {
  const isEditable = isAdmin(useUser().user?.scopes);
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <h1>{data.name}</h1>
          <Link href={`https://osu.ppy.sh/mp/${data.osuId}`} target={'_blank'}>
            <OutIcon />
          </Link>
          {isEditable && (
            <>
              <EditIcon
                className={styles.editIcon}
                onClick={() => setIsAdminViewOpen(true)}
              />
              <Modal
                title={`Editing Match Id: ${data.id}`}
                isOpen={isAdminViewOpen}
                setIsOpen={(isOpen) => setIsAdminViewOpen(isOpen)}
              >
                <MatchAdminView data={data} />
              </Modal>
            </>
          )}
        </div>
        <div className={styles.timeDisplay}>
          <FormattedDate
            className={styles.date}
            date={data.startTime ?? new Date()}
            format={dateFormats.tournaments.header}
          />
          <span>to</span>
          <FormattedDate
            className={styles.date}
            date={data.endTime ?? new Date()}
            format={dateFormats.tournaments.header}
          />
        </div>
      </div>
      <div className={styles.subHeader}>
        <span>
          Played in
        </span>
        <Link href={`/tournaments/${data.tournament.id}`}><h3>{data.tournament.name}</h3></Link>
      </div>
    </div>
  );
}
