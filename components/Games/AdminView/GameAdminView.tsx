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
      <div>
        <span>Ruleset</span>
        <SingleEnumSelect
          enumHelper={RulesetEnumHelper}
          value={game.ruleset}
          onChange={(e) => setGameProp('ruleset', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Scoring Type</span>
        <SingleEnumSelect
          enumHelper={ScoringTypeEnumHelper}
          value={game.scoringType}
          onChange={(e) => setGameProp('scoringType', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Team Type</span>
        <SingleEnumSelect
          enumHelper={TeamTypeEnumHelper}
          value={game.teamType}
          onChange={(e) => setGameProp('teamType', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Mods</span>
        <input />
      </div>
      <br />
      {data.processingStatus === GameProcessingStatus.NeedsVerification && (
        <>
          <button>Re-run automation checks</button>
          <button>Accept pre-verification</button>
          <br />
        </>
      )}
      <button disabled={hasChanges} onClick={() => setGame(data)}>
        Clear Changes
      </button>
      <button disabled={hasChanges}>Save Changes</button>
      <button>Delete</button>
    </>
  );
}
