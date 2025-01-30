'use client';

import RejectionReason from '@/components/Enums/RejectionReason';
import WarningFlags from '@/components/Enums/WarningFlags';
import GameAdminView from '@/components/Games/AdminView/GameAdminView';
import Modal from '@/components/Modal/Modal';
import { dateFormats } from '@/lib/dates';
import {
  GameProcessingStatusEnumHelper,
  ModsEnumHelper,
  RulesetMetadata,
  ScoringTypeEnumHelper,
  TeamTypeEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import EditIcon from '@/public/icons/Edit.svg';
import { GameDTO } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';
import { useState } from 'react';
import styles from './GamesListItem.module.css';

export default function GamesListItemHeader({ data }: { data: GameDTO }) {
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

  const startDate = new Date(data.startTime).toLocaleDateString(
    'en-US',
    dateFormats.tournaments.header
  );
  const endDate = new Date(data.endTime!).toLocaleDateString(
    'en-US',
    dateFormats.tournaments.header
  );

  const RulesetIcon = RulesetMetadata[data.ruleset].image;

  return (
    <div className={styles.gameHeader}>
      <div className={styles.beatmapDim} />
      <Image
        className={styles.beatmapCover}
        src={'https://assets.ppy.sh/beatmaps/4392/covers/cover@2x.jpg'}
        alt={'beatmap cover'}
        fill
      />
      <div className={styles.beatmapInfo}>
        <div className={styles.topSection}>
          <div className={styles.wrap}>
            <RulesetIcon className="fill" />
            <span>
              {ScoringTypeEnumHelper.getMetadata(data.scoringType).text}
            </span>
            <span>{TeamTypeEnumHelper.getMetadata(data.teamType).text}</span>
          </div>
          <div className={styles.wrap}>{`${startDate} - ${endDate}`}</div>
        </div>
        <div className={styles.bottomSection}>
          <div className={styles.row}>
            <span>{data.beatmap.mapperName}</span>
            <span>{`★${data.beatmap.sr.toFixed(2)} • ${data.beatmap.bpm}bpm`}</span>
          </div>
          <div className={styles.row} id={styles.title}>
            {data.beatmap.title} [{data.beatmap.diffName}]
          </div>
        </div>

        {/* {data.isFreeMod ? (
          <span>Free Mod</span>
        ) : (
          <span>
            Force Mod:{' '}
            {ModsEnumHelper.getMetadata(data.mods)
              .map(({ text }) => text)
              .join(', ')}
          </span>
        )} */}

        {/* TODO: Contingent on verified? */}
        {/* <span>
          Verification Status:{' '}
          {VerificationStatusMetadata[data.verificationStatus].text}
        </span>
        <span>
          Processing Status:{' '}
          {
            GameProcessingStatusEnumHelper.getMetadata(data.processingStatus)
              .text
          }
        </span>
        <RejectionReason itemType={'game'} value={data.rejectionReason} />
        <WarningFlags itemType={'game'} value={data.warningFlags} />
        TODO: Contingent on admin view
        <EditIcon
          className={'fill'}
          style={{ height: '1rem', width: '1rem', cursor: 'pointer' }}
          onClick={() => setIsAdminViewOpen(true)}
        /> */}
      </div>
      <Modal
        title={`Editing Game Id: ${data.id}`}
        isOpen={isAdminViewOpen}
        setIsOpen={(isOpen) => setIsAdminViewOpen(isOpen)}
      >
        <GameAdminView data={data} />
      </Modal>
    </div>
  );
}
