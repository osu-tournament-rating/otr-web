'use client';

import {
  TournamentDTO,
  TournamentProcessingStatus,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import { useEffect, useMemo, useState } from 'react';
import {
  RulesetEnumHelper,
  TournamentProcessingStatusEnumHelper,
  VerificationStatusEnumHelper,
} from '@/lib/enums';
import RejectionReason from '@/components/Enums/RejectionReason';
import { isObjectEqual } from '@/util/forms';
import FormatSelector from '@/components/Tournaments/Submission/SubmissionForm/FormatSelector/FormatSelector';
import SingleEnumSelect from '@/components/Enums/Input/SingleEnumSelect';
import { useRouter } from 'next/navigation';
import {
  acceptTournamentPreStatus,
  deleteTournament,
  updateTournament,
} from '@/app/actions/tournaments';
import { createPatchOperations, handleApiCall } from '@/lib/api';
import { toast } from 'sonner';

type ButtonActionType = 'AcceptPreStatus' | 'Delete' | 'Edit';

export default function TournamentAdminView({ data }: { data: TournamentDTO }) {
  const router = useRouter();
  const [origTournament, setOrigTournament] = useState(data);
  const [tournament, setTournament] = useState(data);
  const hasChanges = useMemo(() => {
    return isObjectEqual(origTournament, tournament);
  }, [origTournament, tournament]);
  const [pendingAction, setPendingAction] = useState<
    ButtonActionType | undefined
  >(undefined);

  const setTournamentProp = <K extends keyof TournamentDTO>(
    propName: K,
    value: TournamentDTO[K]
  ) => setTournament((prev) => ({ ...prev, [propName]: value }));

  useEffect(() => {
    setTournament(data);
    setOrigTournament(data);
  }, [data]);

  const handleAcceptPreStatus = async () => {
    setPendingAction('AcceptPreStatus');
    await handleApiCall(
      () => acceptTournamentPreStatus({ id: tournament.id }),
      {
        onSuccess: () => {
          router.refresh();
          toast.success('Pre-status accepted', { position: 'top-center' });
        },
      }
    );

    setPendingAction(undefined);
  };

  const handleDelete = async () => {
    setPendingAction('Delete');
    await handleApiCall(() => deleteTournament({ id: tournament.id }), {
      onError: (err, defaultCallback) => {
        setPendingAction(undefined);
        defaultCallback(err);
      },
      onSuccess: () => {
        const navBack = () => router.push('/tournaments');

        toast.success(
          () => (
            <div>
              <h1>Tournament deleted successfully</h1>
              <br />
              You will be redirected to the tournaments search page
            </div>
          ),
          {
            onAutoClose: navBack,
            onDismiss: navBack,
            position: 'top-center',
          }
        );
      },
    });
  };

  const handleSaveChanges = async () => {
    setPendingAction('Edit');
    await handleApiCall(
      () =>
        updateTournament({
          id: tournament.id,
          body: createPatchOperations(origTournament, tournament),
        }),
      {
        onSuccess: () => {
          router.refresh();
          toast.success('Changes saved', { position: 'top-center' });
        },
      }
    );

    setPendingAction(undefined);
  };

  return (
    <>
      <RejectionReason itemType={'tournament'} value={data.rejectionReason} />
      <span>
        Processing Status:{' '}
        {
          TournamentProcessingStatusEnumHelper.getMetadata(
            data.processingStatus
          ).text
        }
      </span>
      <div>
        <span>Verification Status</span>
        <SingleEnumSelect
          enumHelper={VerificationStatusEnumHelper}
          value={tournament.verificationStatus}
          onChange={(e) =>
            setTournamentProp('verificationStatus', Number(e.target.value))
          }
        />
      </div>
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
          onChange={(e) =>
            setTournamentProp('lobbySize', Number(e.target.value))
          }
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
          onChange={(e) =>
            setTournamentProp('rankRangeLowerBound', e.target.valueAsNumber)
          }
        />
      </div>
      <br />
      {data.processingStatus ===
        TournamentProcessingStatus.NeedsVerification && (
        <>
          <button
            disabled={
              (data.verificationStatus !== VerificationStatus.PreVerified &&
                data.verificationStatus !== VerificationStatus.PreRejected) ||
              !!pendingAction
            }
          >
            Re-run automation checks
          </button>
          <button
            disabled={
              (data.verificationStatus !== VerificationStatus.PreVerified &&
                data.verificationStatus !== VerificationStatus.PreRejected) ||
              !!pendingAction
            }
            onClick={handleAcceptPreStatus}
          >
            {pendingAction && pendingAction === 'AcceptPreStatus'
              ? 'Accepting...'
              : 'Accept pre-verification'}
          </button>
          <br />
        </>
      )}
      <button
        disabled={hasChanges || !!pendingAction}
        onClick={() => setTournament(origTournament)}
      >
        Clear Changes
      </button>
      <button
        disabled={hasChanges || !!pendingAction}
        onClick={handleSaveChanges}
      >
        {pendingAction && pendingAction === 'Edit'
          ? 'Saving changes...'
          : 'Save Changes'}
      </button>
      <button disabled={!!pendingAction} onClick={handleDelete}>
        {pendingAction && pendingAction === 'Delete' ? 'Deleting...' : 'Delete'}
      </button>
    </>
  );
}
