'use client';

import {
  TournamentDTO, TournamentProcessingStatus, VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import { useEffect, useState } from 'react';
import {
  RulesetEnumHelper,
  TournamentProcessingStatusEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import RejectionReason from '@/components/Enums/RejectionReason';
import { isObjectEqual } from '@/util/forms';
import FormatSelector from '@/components/Tournaments/Submission/SubmissionForm/FormatSelector/FormatSelector';
import SingleEnumSelect from '@/components/Enums/Input/SingleEnumSelect';
import { useRouter } from 'next/navigation';
import { acceptTournamentPreStatus, deleteTournament } from '@/app/actions/tournaments';

export default function TournamentAdminView({ data }: { data: TournamentDTO }) {
  const router = useRouter()
  const [tournament, setTournament] = useState(data);
  const [hasChanges, setHasChanges] = useState(isObjectEqual(data, tournament));

  const setTournamentProp = <K extends keyof TournamentDTO>(
    propName: K,
    value: TournamentDTO[K]
  ) => setTournament((prev) => ({ ...prev, [propName]: value }));

  useEffect(() => {
    setHasChanges(isObjectEqual(data, tournament));
  }, [data, tournament]);

  const handleAcceptPreStatus = async () => {
    try {
      await acceptTournamentPreStatus({ id: tournament.id });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTournament({ id: tournament.id });
      router.push('/tournaments');
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <span>
        Verification Status:{' '}
        {VerificationStatusMetadata[data.verificationStatus].text}
      </span>
      <span>
        Processing Status:{' '}
        {TournamentProcessingStatusEnumHelper.getMetadata(data.processingStatus).text}
      </span>
      <RejectionReason itemType={'match'} value={data.rejectionReason} />
      <br />
      <div>
        <span>Name</span>
        <input
          value={tournament.name}
          onChange={(e) => setTournamentProp('name', e.target.value)}
        />
      </div>
      <div>
        <span>Abbreviation</span>
        <input
          value={tournament.abbreviation}
          onChange={(e) => setTournamentProp('abbreviation', e.target.value)}
        />
      </div>
      <div>
        <span>Forum Post URL</span>
        <input
          value={tournament.forumUrl}
          onChange={(e) => setTournamentProp('forumUrl', e.target.value)}
        />
      </div>
      <div>
        <span>Format</span>
        <FormatSelector
          value={tournament.lobbySize}
          onChange={(e) => setTournamentProp('lobbySize', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Ruleset</span>
        <SingleEnumSelect
          enumHelper={RulesetEnumHelper}
          value={tournament.ruleset}
          onChange={(e) => setTournamentProp('ruleset', Number(e.target.value))}
        />
      </div>
      <div>
        <span>Rank Restriction</span>
        <input
          type={'number'}
          min={1}
          value={tournament.rankRangeLowerBound}
          onChange={(e) => setTournamentProp('rankRangeLowerBound', e.target.valueAsNumber)}
        />
      </div>
      <br />
      {data.processingStatus === TournamentProcessingStatus.NeedsVerification && (
        <>
          <button
            disabled={data.verificationStatus !== VerificationStatus.PreVerified && data.verificationStatus !== VerificationStatus.PreRejected}
          >
            Re-run automation checks
          </button>
          <button
            disabled={data.verificationStatus !== VerificationStatus.PreVerified && data.verificationStatus !== VerificationStatus.PreRejected}
            onClick={handleAcceptPreStatus}>
            Accept pre-verification
          </button>
          <br />
        </>
      )}
      <button disabled={hasChanges} onClick={() => setTournament(data)}>
        Clear Changes
      </button>
      <button disabled={hasChanges}>Save Changes</button>
      <button onClick={handleDelete}>Delete</button>
    </>
  );
}
