'use client';

import ModsDisplay from '@/components/Enums/ModsDisplay/ModsDisplay';
import RejectionReason from '@/components/Enums/RejectionReason';
import WarningFlags from '@/components/Enums/WarningFlags';
import GameAdminView from '@/components/Games/AdminView/GameAdminView';
import Modal from '@/components/Modal/Modal';
import { isAdmin } from '@/lib/api';
import { dateFormats } from '@/lib/dates';
import {
  ModsEnumHelper,
  RulesetMetadata,
  ScoringTypeEnumHelper,
  TeamTypeEnumHelper,
} from '@/lib/enums';
import EditIcon from '@/public/icons/Edit.svg';
import { useUser } from '@/util/hooks';
import { GameDTO, Mods } from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';
import { ReactNode, useState } from 'react';
import styles from './GamesListItem.module.css';

export default function GamesListItemHeader({ data }: { data: GameDTO }) {
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);
  const isViewerAdmin = isAdmin(useUser().user?.scopes);
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
        src={`https://assets.ppy.sh/beatmaps/${data.beatmap.beatmapSet?.osuId}/covers/cover@2x.jpg`}
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
            <RejectionReason itemType={'game'} value={data.rejectionReason} />
            <WarningFlags itemType={'game'} value={data.warningFlags} />
          </div>
          <div className={styles.wrap}>
            {`${startDate} - ${endDate}`}
            {isViewerAdmin && (
              <EditIcon
                className={'fill'}
                style={{ height: '1rem', width: '1rem', cursor: 'pointer' }}
                onClick={() => setIsAdminViewOpen(true)}
              />
            )}
          </div>
        </div>
        <div className={styles.bottomSection}>
          <div className={styles.column}>
            <div className={styles.row}>
              <span>
                Set by {data.beatmap.beatmapSet?.creator?.username} • Map by{' '}
                {data.beatmap.creators.map((p) => p.username).join()}
              </span>
              <span>{`★${data.beatmap.sr.toFixed(2)} • ${data.beatmap.bpm}bpm`}</span>
            </div>
            <div className={styles.row}>
              <span id={styles.title}>
                {data.beatmap.beatmapSet?.title} [{data.beatmap.diffName}]
              </span>
            </div>
          </div>
          <div className={styles.modsContainer}>
            <ModsDisplay
              mods={data.mods}
              isFreeMod={data.isFreeMod}
              containerClass={styles.modsContainer}
              modClass={styles.mod}
            />
          </div>
        </div>
      </div>
      {isViewerAdmin && (
        <Modal
          title={`Editing Game Id: ${data.id}`}
          isOpen={isAdminViewOpen}
          setIsOpen={(isOpen) => setIsAdminViewOpen(isOpen)}
        >
          <GameAdminView data={data} />
        </Modal>
      )}
    </div>
  );
}
