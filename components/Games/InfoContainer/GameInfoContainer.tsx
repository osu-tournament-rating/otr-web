'use client';

import { GameDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/InfoContainer/TournamentInfoContainer.module.css';
import VerificationStatusButton from '@/components/Button/VerificationStatusButton/VerificationStatusButton';
import clsx from 'clsx';
import InfoContainerField from '@/components/Tournaments/InfoContainer/InfoContainerField';
import WarningFlags from '@/components/Enums/WarningFlags';
import RejectionReason from '@/components/Enums/RejectionReason';
import {
  ModsEnumHelper,
  RulesetMetadata,
  ScoringTypeEnumHelper,
} from '@/lib/enums';

export default function GameInfoContainer({
  data,
  showName = false,
}: {
  data: GameDTO;
  showName?: boolean;
}) {
  // const { isAdminView } = useAdminViewContext();
  const isAdminView = false;

  const rulesetMeta = RulesetMetadata[data.ruleset];

  return (
    <div className={styles.content}>
      {isAdminView && (
        <>
          {/* Shows confirmation modal */}
          <div className={styles.field}>
            <button>Delete</button>
          </div>
          {/* Active / visible if processing status == awaiting verification */}
          <div className={styles.field}>
            <button>Accept pre-status</button>
          </div>
          <div className={styles.field}>
            <VerificationStatusButton
              initialStatus={data.verificationStatus}
              isAdminView
              //   onChange={async (status) => {
              //     const updatedMatch = await patchMatchData({
              //       id: data.id,
              //       path: 'verificationStatus',
              //       value: status,
              //     });
              //     Object.assign(data, updatedMatch);
              //   }}
            />
          </div>
        </>
      )}
      <div className={clsx(styles.field, styles.single)}>
        <RejectionReason itemType={'game'} value={data.rejectionReason} />
      </div>
      <div className={clsx(styles.field, styles.single)}>
        <WarningFlags itemType={'game'} value={data.warningFlags} />
      </div>
      <InfoContainerField label={'Ruleset'}>
        <div className={styles.value}>{rulesetMeta.shortAlt}</div>
      </InfoContainerField>
      <InfoContainerField label={'Scoring Type'}>
        <div className={styles.value}>
          {ScoringTypeEnumHelper.getMetadata(data.scoringType).text}
        </div>
      </InfoContainerField>
      <InfoContainerField label={'Mods'}>
        <div className={styles.value}>
          {ModsEnumHelper.getMetadata(data.mods)
            .map(({ text }) => text)
            .join(', ')}
        </div>
      </InfoContainerField>
    </div>
  );
}
