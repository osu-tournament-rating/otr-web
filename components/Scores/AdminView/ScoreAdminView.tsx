'use client';

import {
  GameScoreDTO,
  ScoreProcessingStatus,
} from '@osu-tournament-rating/otr-api-client';
import {
  RulesetEnumHelper,
  ScoreGradeEnumHelper,
  ScoreProcessingStatusEnumHelper,
  TeamEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import RejectionReason from '@/components/Enums/RejectionReason';
import SingleEnumSelect from '@/components/Enums/Input/SingleEnumSelect';
import { useEffect, useState } from 'react';
import { isObjectEqual } from '@/util/forms';

export default function ScoreAdminView({ data }: { data: GameScoreDTO }) {
  const [score, setScore] = useState<GameScoreDTO>(data);
  const [hasChanges, setHasChanges] = useState(isObjectEqual(data, score));

  const setScoreProp = <K extends keyof GameScoreDTO>(
    propName: K,
    value: GameScoreDTO[K]
  ) => setScore((prev) => ({ ...prev, [propName]: value }));

  useEffect(() => {
    setHasChanges(isObjectEqual(data, score));
  }, [data, score]);

  return (
    <>
      <span>
        Verification Status:{' '}
        {VerificationStatusMetadata[data.verificationStatus].text}
      </span>
      <span>
        Processing Status:{' '}
        {
          ScoreProcessingStatusEnumHelper.getMetadata(data.processingStatus)
            .text
        }
      </span>
      <RejectionReason itemType={'score'} value={data.rejectionReason} />
      <br />
      <div>
        <span>Ruleset</span>
        <SingleEnumSelect
          enumHelper={RulesetEnumHelper}
          value={score.ruleset}
          onChange={(e) => setScoreProp('ruleset', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Team</span>
        <SingleEnumSelect
          enumHelper={TeamEnumHelper}
          value={score.team}
          onChange={(e) => setScoreProp('team', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Grade</span>
        <SingleEnumSelect
          enumHelper={ScoreGradeEnumHelper}
          value={score.grade}
          onChange={(e) => setScoreProp('grade', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Score</span>
        <input
          type={'number'}
          value={score.score}
          onChange={(e) => setScoreProp('score', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Max Combo</span>
        <input
          type={'number'}
          value={score.maxCombo}
          onChange={(e) => setScoreProp('maxCombo', Number(e.target.value))}
        />
      </div>
      <div>
        <span>300 Count</span>
        <input
          type={'number'}
          value={score.count300}
          onChange={(e) => setScoreProp('count300', Number(e.target.value))}
        />
      </div>
      <div>
        <span>100 Count</span>
        <input
          type={'number'}
          value={score.count100}
          onChange={(e) => setScoreProp('count100', Number(e.target.value))}
        />
      </div>
      <div>
        <span>50 Count</span>
        <input
          type={'number'}
          value={score.count50}
          onChange={(e) => setScoreProp('count50', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Miss Count</span>
        <input
          type={'number'}
          value={score.countMiss}
          onChange={(e) => setScoreProp('countMiss', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Mods</span>
        <input />
      </div>
      <br />
      {data.processingStatus === ScoreProcessingStatus.NeedsVerification && (
        <>
          <button>Re-run automation checks</button>
          <button>Accept pre-verification</button>
          <br />
        </>
      )}
      <button disabled={hasChanges} onClick={() => setScore(data)}>
        Clear Changes
      </button>
      <button disabled={hasChanges}>Save Changes</button>
      <button>Delete</button>
    </>
  );
}
