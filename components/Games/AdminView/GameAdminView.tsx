'use client';

import {
  GameDTO,
  GameProcessingStatus,
} from '@osu-tournament-rating/otr-api-client';
import { useEffect, useState } from 'react';
import {
  GameProcessingStatusEnumHelper,
  RulesetEnumHelper,
  ScoringTypeEnumHelper,
  TeamTypeEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import RejectionReason from '@/components/Enums/RejectionReason';
import WarningFlags from '@/components/Enums/WarningFlags';
import { isObjectEqual } from '@/util/forms';
import SingleEnumSelect from '@/components/Enums/Input/SingleEnumSelect';
import styles from './GameAdminView.module.css';
import {
  faArrowRotateLeft,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function GameAdminView({ data }: { data: GameDTO }) {
  const [game, setGame] = useState(data);
  const [hasChanges, setHasChanges] = useState(isObjectEqual(data, game));

  const setGameProp = <K extends keyof GameDTO>(
    propName: K,
    value: GameDTO[K]
  ) => setGame((prev) => ({ ...prev, [propName]: value }));

  useEffect(() => {
    setHasChanges(isObjectEqual(data, game));
  }, [data, game]);

  return (
    <>
      <span>
        Verification Status:{' '}
        {VerificationStatusMetadata[data.verificationStatus].text}
      </span>
      <span>
        Processing Status:{' '}
        {GameProcessingStatusEnumHelper.getMetadata(data.processingStatus).text}
      </span>
      <RejectionReason itemType={'game'} value={data.rejectionReason} />
      <WarningFlags itemType={'game'} value={data.warningFlags} />
      <br />
      <div className={styles.mainContainer}>
        <div className={styles.inputContainer}>
          <div className={styles.input}>
            <span>Ruleset</span>
            <SingleEnumSelect
              enumHelper={RulesetEnumHelper}
              value={game.ruleset}
              onChange={(e) => setGameProp('ruleset', Number(e.target.value))}
            />
          </div>
          <div className={styles.input}>
            <span>Scoring Type</span>
            <SingleEnumSelect
              enumHelper={ScoringTypeEnumHelper}
              value={game.scoringType}
              onChange={(e) =>
                setGameProp('scoringType', Number(e.target.value))
              }
            />
          </div>
          <div className={styles.input}>
            <span>Team Type</span>
            <SingleEnumSelect
              enumHelper={TeamTypeEnumHelper}
              value={game.teamType}
              onChange={(e) => setGameProp('teamType', Number(e.target.value))}
            />
          </div>
          <div className={styles.input}>
            <span>Mods</span>
            <input />
          </div>
        </div>
        <br />
        {data.processingStatus === GameProcessingStatus.NeedsVerification && (
          <>
            <button>Re-run automation checks</button>
            <button>Accept pre-verification</button>
            <br />
          </>
        )}
        <div className={styles.buttonsRow}>
          <button id={styles.delete}>
            <FontAwesomeIcon icon={faTrashCan} />
          </button>
          <button disabled={hasChanges} onClick={() => setGame(data)}>
            <FontAwesomeIcon icon={faArrowRotateLeft} />
          </button>
          <button id={styles.save} disabled={hasChanges}>
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}
