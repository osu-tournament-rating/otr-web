'use client';

import RejectionReason from '@/components/Enums/RejectionReason';
import { isAdmin } from '@/lib/api';
import { ScoreGradeEnumHelper } from '@/lib/enums';
import EditIcon from '@/public/icons/Edit.svg';
import { useUser } from '@/util/hooks';
import {
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import Image from 'next/image';
import { useState } from 'react';
import ModsDisplay from '../Enums/ModsDisplay/ModsDisplay';
import FormattedNumber from '../FormattedData/FormattedNumber';
import Modal from '../Modal/Modal';
import ScoreAdminView from './AdminView/ScoreAdminView';
import styles from './GameScore.module.css';

export default function GameScore({
  row,
  data,
  player,
}: {
  row: number;
  data: GameScoreDTO;
  player?: PlayerCompactDTO;
}) {
  const isEditable = isAdmin(useUser().user?.scopes);
  const [isAdminViewOpen, setIsAdminViewOpen] = useState(false);

  return (
    <div
      className={styles.scoreContainer}
      aria-team={Team[data.team]}
      style={{
        gridRow: row,
      }}
    >
      <div
        className={styles.propic}
        style={{ backgroundImage: `url(https://s.ppy.sh/a/${player?.osuId})` }}
      />
      <div className={styles.teamColor}>
        {isEditable && (
          <EditIcon
            className={styles.editButton}
            onClick={() => setIsAdminViewOpen(true)}
          />
        )}
      </div>
      <div className={styles.backgroundColor} />
      <div className={styles.column}>
        <div className={styles.row}>
          <div className={styles.playerInfo}>
            <span className={styles.country}>
              <Image
                src={`https://osu.ppy.sh/images/flags/${player?.country}.png`}
                alt={`country-${player?.country}`}
                fill
              />
            </span>
            <span className={styles.name}>{player?.username}</span>
          </div>
          <div className={styles.scoreInfo}>
            <RejectionReason
              itemType={'score'}
              alignment="right"
              hoverable
              value={data.rejectionReason}
            />
            <div className={styles.score}>
              {FormattedNumber({ number: data.score })}
            </div>
            <ModsDisplay
              mods={data.mods}
              containerClass={styles.modsContainer}
              modClass={styles.mod}
              reverse={data.team === Team.Blue}
            />
            <div className={styles.grade}>
              {ScoreGradeEnumHelper.getMetadata(data.grade).text}
            </div>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.performanceInfo}>
            <div className={styles.item}>
              <div className={styles.label}>300</div>
              <div className={styles.value}>{data.count300}x</div>
            </div>
            <div className={styles.item}>
              <div className={styles.label}>100</div>
              <div className={styles.value}>{data.count100}x</div>
            </div>
            <div className={styles.item}>
              <div className={styles.label}>50</div>
              <div className={styles.value}>{data.count50}x</div>
            </div>
            <div className={styles.item}>
              <div className={styles.label}>Miss</div>
              <div className={styles.value}>{data.countMiss}x</div>
            </div>
          </div>
          <div className={styles.performanceInfo}>
            <div className={styles.item}>
              <div className={styles.label}>Combo</div>
              <div className={styles.value}>{data.maxCombo}x</div>
            </div>
            <div className={styles.item}>
              <div className={styles.label}>Accuracy</div>
              <div className={styles.value}>{data.accuracy.toFixed(2)}%</div>
            </div>
          </div>
        </div>
      </div>
      {isEditable && (
        <Modal
          title={`Editing Match Id: ${data.id}`}
          isOpen={isAdminViewOpen}
          setIsOpen={(isOpen) => setIsAdminViewOpen(isOpen)}
        >
          <ScoreAdminView data={data} />
        </Modal>
      )}
    </div>
  );
}
