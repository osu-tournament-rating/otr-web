'use client';

import styles from './TournamentPageContent.module.css';
import Link from 'next/link';
import OutIcon from '@/public/icons/out.svg';
import FormattedDate from '@/components/FormattedData/FormattedDate';
import { dateFormats } from '@/lib/dates';
import React, { useState } from 'react';
import { TournamentDTO } from '@osu-tournament-rating/otr-api-client';
import EditIcon from '@/public/icons/Edit.svg';
import Modal from '@/components/Modal/Modal';
import { isAdmin } from '@/lib/api';
import { useUser } from '@/util/hooks';
import TournamentAdminView from '@/components/Tournaments/AdminView/TournamentAdminView';

export default function TournamentPageHeader({ data }: { data: TournamentDTO }) {
  const isEditable = isAdmin(useUser().user?.scopes);
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

  return (
    <div className={styles.header}>
      <div className={styles.title}>
        <h1>{data.name}</h1>
        <Link href={data.forumUrl} target={'_blank'}>
          <OutIcon />
        </Link>
        {isEditable && (
          <>
            <EditIcon
              className={styles.editIcon}
              onClick={() => setIsAdminViewOpen(true)}
            />
            <Modal
              title={`Editing Tournament Id: ${data.id}`}
              isOpen={isAdminViewOpen}
              setIsOpen={(isOpen) => setIsAdminViewOpen(isOpen)}
            >
              <TournamentAdminView data={data} />
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
  );
}
