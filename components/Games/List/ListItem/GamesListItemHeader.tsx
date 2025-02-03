'use client';

import { GameDTO } from '@osu-tournament-rating/otr-api-client';
import styles from './GamesListItem.module.css';
import Image from 'next/image';
import {
  GameProcessingStatusEnumHelper,
  ModsEnumHelper,
  RulesetMetadata,
  ScoringTypeEnumHelper,
  TeamTypeEnumHelper, VerificationStatusMetadata,
} from '@/lib/enums';
import { dateFormats } from '@/lib/dates';
import RejectionReason from '@/components/Enums/RejectionReason';
import WarningFlags from '@/components/Enums/WarningFlags';
import EditIcon from '@/public/icons/Edit.svg'
import Modal from '@/components/Modal/Modal';
import GameAdminView from '@/components/Games/AdminView/GameAdminView';
import { useState } from 'react';

export default function GamesListItemHeader({ data }: { data: GameDTO }) {
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

  return (
    <div className={styles.gameHeader}>
      <Image
        className={styles.beatmapCover}
        src={'https://assets.ppy.sh/beatmaps/292301/covers/cover@2x.jpg'}
        width={1000}
        height={150}
        alt={'beatmap cover'}
      />
      <span>
        {RulesetMetadata[data.ruleset].shortAlt} •{' '}
        {ScoringTypeEnumHelper.getMetadata(data.scoringType).text} •{' '}
        {TeamTypeEnumHelper.getMetadata(data.teamType).text}
      </span>
      {data.isFreeMod ? (
        <span>Free Mod</span>
      ) : (
        <span>
          Force Mod:{' '}
          {ModsEnumHelper.getMetadata(data.mods)
            .map(({ text }) => text)
            .join(', ')}
        </span>
      )}
      <span>
        {new Date(data.startTime).toLocaleDateString(
          'en-US',
          dateFormats.tournaments.header
        )}
        {' to '}
        {new Date(data.endTime!).toLocaleDateString(
          'en-US',
          dateFormats.tournaments.header
        )}
      </span>
      <span>
        {data.beatmap.mapperName} ★{data.beatmap.sr.toFixed(2)} •
        {data.beatmap.bpm}
      </span>
      <span>
        {data.beatmap.title} [{data.beatmap.diffName}]
      </span>
      <br/>
      {/* TODO: Contingent on verified? */}
      <span>
        Verification Status: {VerificationStatusMetadata[data.verificationStatus].text}
      </span>
      <span>
        Processing Status: {GameProcessingStatusEnumHelper.getMetadata(data.processingStatus).text}
      </span>
      <RejectionReason itemType={'game'} value={data.rejectionReason} />
      <WarningFlags itemType={'game'} value={data.warningFlags} />
      {/* TODO: Contingent on admin view */}
      <EditIcon
        className={'fill'}
        style={{ height: '1rem', width: '1rem', cursor: 'pointer' }}
        onClick={() => setIsAdminViewOpen(true)}
      />
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
