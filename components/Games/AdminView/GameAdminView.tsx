'use client';

import {
  GameDTO,
  GameProcessingStatus,
} from '@osu-tournament-rating/otr-api-client';
import { useEffect, useState } from 'react';
import {
  GameProcessingStatusEnumHelper,
  ScoringTypeEnumHelper,
  TeamTypeEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import RejectionReason from '@/components/Enums/RejectionReason';
import WarningFlags from '@/components/Enums/WarningFlags';

const areObjectsEqual = (obj1: GameDTO, obj2: GameDTO) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

export default function GameAdminView({ data }: { data: GameDTO }) {
  const [game, setGame] = useState(data);
  const [hasChanges, setHasChanges] = useState(areObjectsEqual(data, game));

  const setGameProp = <K extends keyof GameDTO>(
    propName: K,
    value: GameDTO[K]
  ) => setGame((prev) => ({ ...prev, [propName]: value }));

  useEffect(() => {
    setHasChanges(areObjectsEqual(data, game));
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
      <div>
        <span>Ruleset</span>
        <input />
      </div>
      <div>
        <span>Scoring Type</span>
        <select
          value={game.scoringType}
          onChange={(e) => setGameProp('scoringType', Number(e.target.value))}
        >
          {Object.entries(ScoringTypeEnumHelper.metadata).map(
            ([key, { text }]) => (
              <option key={key} value={Number(key)}>
                {text}
              </option>
            )
          )}
        </select>
      </div>
      <div>
        <span>Team Type</span>
        <select
          value={game.teamType}
          onChange={(e) => setGameProp('teamType', Number(e.target.value))}
        >
          {Object.entries(TeamTypeEnumHelper.metadata).map(
            ([key, { text }]) => (
              <option key={key} value={Number(key)}>
                {text}
              </option>
            )
          )}
        </select>
      </div>
      <div>
        <span>Mods</span>
        <input />
      </div>
      <button disabled={hasChanges} onClick={() => setGame(data)}>
        Clear Changes
      </button>
      {data.processingStatus === GameProcessingStatus.NeedsVerification && (
        <>
          <button>
            Re-run automation checks
          </button>
          <button>
            Accept pre-verification
          </button>
        </>
      )}
    </>
  );
}
