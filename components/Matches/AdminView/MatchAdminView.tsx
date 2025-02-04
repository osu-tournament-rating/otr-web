'use client';

import {
  MatchDTO,
  MatchProcessingStatus,
} from '@osu-tournament-rating/otr-api-client';
import { useEffect, useState } from 'react';
import {
  MatchProcessingStatusEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import RejectionReason from '@/components/Enums/RejectionReason';
import WarningFlags from '@/components/Enums/WarningFlags';
import { isObjectEqual } from '@/util/forms';
import SingleEnumSelect from '@/components/Enums/Input/SingleEnumSelect';

export default function MatchAdminView({ data }: { data: MatchDTO }) {
  const [match, setMatch] = useState(data);
  const [hasChanges, setHasChanges] = useState(isObjectEqual(data, match));

  const setMatchProp = <K extends keyof MatchDTO>(
    propName: K,
    value: MatchDTO[K]
  ) => setMatch((prev) => ({ ...prev, [propName]: value }));

  useEffect(() => {
    setHasChanges(isObjectEqual(data, match));
  }, [data, match]);

  return (
    <>
      <span>
        Verification Status:{' '}
        {VerificationStatusMetadata[data.verificationStatus].text}
      </span>
      <span>
        Processing Status:{' '}
        {
          MatchProcessingStatusEnumHelper.getMetadata(data.processingStatus)
            .text
        }
      </span>
      <RejectionReason itemType={'match'} value={data.rejectionReason} />
      <WarningFlags itemType={'match'} value={data.warningFlags} />
      <br />
      <div>
        <span>Lobby Title</span>
        <input
          value={match.name}
          onChange={(e) => setMatchProp('name', e.target.value)}
        />
      </div>
      <div>
        <span>Start Time</span>
        <input type={'date'} />
      </div>
      <div>
        <span>End Time</span>
        <input type={'date'} />
      </div>
      <br />
      {data.processingStatus === MatchProcessingStatus.NeedsVerification && (
        <>
          <button>Re-run automation checks</button>
          <button>Accept pre-verification</button>
          <br />
        </>
      )}
      <button disabled={hasChanges} onClick={() => setMatch(data)}>
        Clear Changes
      </button>
      <button disabled={hasChanges}>Save Changes</button>
      <button>Delete</button>
    </>
  );
}
