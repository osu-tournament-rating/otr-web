'use client';

import VerificationStatusButton from '@/components/Button/VerificationStatusButton/VerificationStatusButton';
import Link from 'next/link';
import styles from './TournamentInfoContainer.module.css';
import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import { patchTournamentData } from '@/app/actions/tournaments';
import { RulesetMetadata } from '@/lib/enums';
import EditIcon from '@/public/icons/Edit.svg';
import {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
  useState,
} from 'react';
import { useClickAway } from '@uidotdev/usehooks';
import { useAdminViewContext } from '@/components/Context/AdminViewContext';
import FormatSelector from '@/components/Tournaments/Submission/SubmissionForm/FormatSelector/FormatSelector';
import DropdownRulesetSelector from '@/components/Tournaments/Submission/SubmissionForm/DropdownRulesetSelector/DropdownRulesetSelector';
import clsx from 'clsx';
import InfoContainerField from './InfoContainerField';
import RejectionReason from '@/components/Enums/RejectionReason';

export default function TournamentInfoContainer({
  data,
  showName = false,
  onDataChanged = () => {},
}: {
  /** Tournament data */
  data: TournamentCompactDTO;
  /** Whether to show the tournament's name */
  showName?: boolean;
  /** Callback function invoked when any of the given data changes */
  onDataChanged?: (data: TournamentCompactDTO) => void;
}) {
  // TODO: Also need a way of determining whether data is verified only
  const { isAdminView } = useAdminViewContext();

  return (
    <div className={styles.content}>
      {/** Verification Status */}
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
              onChange={async (status) => {
                const updatedTournament = await patchTournamentData({
                  id: data.id,
                  path: 'verificationStatus',
                  value: status,
                });
                Object.assign(data, updatedTournament);
              }}
            />
          </div>
        </>
      )}
      <div className={clsx(styles.field, styles.single)}>
        <RejectionReason itemType={'tournament'} value={data.rejectionReason} />
      </div>
      {/** Name */}
      {showName && (
        <div className={styles.field} id={styles.tournamentName}>
          <div className={styles.name}>Name</div>
          <div className={styles.value}>{data.name}</div>
        </div>
      )}
      <AbbreviationField data={data} onDataChanged={onDataChanged} />
      <FormatField data={data} onDataChanged={onDataChanged} />
      <RulesetField data={data} onDataChanged={onDataChanged} />
      <ForumPostField data={data} onDataChanged={onDataChanged} />
      <InfoContainerField label={'Submitter'}>
        <div className={styles.value}>
          {data.submittedByUser ? (
            <Link href={`/players/${data.submittedByUser.player.id}`}>
              {data.submittedByUser.player.username}
            </Link>
          ) : (
            'Unknown submitter'
          )}
        </div>
      </InfoContainerField>
      {/** Verifier */}
      <InfoContainerField label={'Verifier'}>
        <div className={styles.value}>
          {data.verifiedByUser ? (
            <Link href={`/players/${data.verifiedByUser.player.id}`}>
              {data.verifiedByUser.player.username}
            </Link>
          ) : (
            'Unknown verifier'
          )}
        </div>
      </InfoContainerField>
    </div>
  );
}

// Acts as a state manager for editable values
function EditableFieldValue<K extends keyof TournamentCompactDTO>({
  data,
  target,
  onDataChanged,
  children,
}: {
  data: TournamentCompactDTO;
  target: K;
  onDataChanged: (data: TournamentCompactDTO) => void;
  children: ({
    editableRef,
    isEditable,
    isEditing,
    isSubmitting,
    value,
    setValue,
    submitValue,
  }: {
    /** Reference to attach to the editable input, controls click away */
    editableRef: MutableRefObject<any>;
    /** If the value is editable */
    isEditable: boolean;
    /** If the value is currently being edited */
    isEditing: boolean;
    /** If a request is being made */
    isSubmitting: boolean;
    /** The current value */
    value: TournamentCompactDTO[K];
    /** Callback to set the current value */
    setValue: Dispatch<SetStateAction<TournamentCompactDTO[K]>>;
    /** Callback to submit the current value as a patch request */
    submitValue: () => void;
  }) => ReactNode;
}) {
  const { isAdminView: isEditable } = useAdminViewContext();

  const [originalValue, setOriginalValue] = useState(data[target]);
  const [editableValue, setEditableValue] = useState(originalValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle aborting an edit
  const abortEdit = () => {
    setEditableValue(originalValue);
    setIsEditing(false);
  };

  // Handle submitting an edit
  const submitValue = () => {
    // Early return if no change
    if (editableValue === originalValue) {
      abortEdit();
      return;
    }

    try {
      setIsSubmitting(true);

      patchTournamentData({
        id: data.id,
        path: target!,
        value: editableValue,
      }).then((updatedTournament) => {
        setOriginalValue(updatedTournament[target]);
        onDataChanged({ ...data, [target]: updatedTournament[target] });
        setIsEditing(false);
      });
    } catch (e) {
      // TODO: Show error toast
      abortEdit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {children({
        editableRef: useClickAway(abortEdit),
        isEditable,
        isEditing,
        isSubmitting,
        value: editableValue,
        setValue: setEditableValue,
        submitValue,
      })}
      {isEditable && !isEditing && (
        <EditIcon
          className={'fill'}
          onClick={() => {
            if (!isEditing) setIsEditing(true);
          }}
        />
      )}
    </>
  );
}

function AbbreviationField({
  data,
  onDataChanged,
}: {
  data: TournamentCompactDTO;
  onDataChanged: (data: TournamentCompactDTO) => void;
}) {
  return (
    <InfoContainerField label={'Abbreviation'}>
      <EditableFieldValue
        data={data}
        target={'abbreviation'}
        onDataChanged={onDataChanged}
      >
        {({
          editableRef,
          isEditable,
          isEditing,
          isSubmitting,
          value,
          setValue,
          submitValue,
        }) => {
          if (!isEditable || (isEditable && !isEditing)) {
            return <div className={styles.value}>{value}</div>;
          }

          return (
            <input
              className={styles.value}
              ref={editableRef}
              type={'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) submitValue();
              }}
              autoFocus
              disabled={isSubmitting}
            />
          );
        }}
      </EditableFieldValue>
    </InfoContainerField>
  );
}

function FormatField({
  data,
  onDataChanged,
}: {
  data: TournamentCompactDTO;
  onDataChanged: (data: TournamentCompactDTO) => void;
}) {
  return (
    <InfoContainerField label={'Format'}>
      <EditableFieldValue
        data={data}
        target={'lobbySize'}
        onDataChanged={onDataChanged}
      >
        {({
          editableRef,
          isEditable,
          isEditing,
          isSubmitting,
          value,
          submitValue,
        }) => {
          if (!isEditable || (isEditable && !isEditing)) {
            return <div className={styles.value}>{`${value}v${value}`}</div>;
          }

          return (
            <div ref={editableRef}>
              <FormatSelector
                value={value}
                disabled={isSubmitting}
                onChange={submitValue}
                autoFocus
              />
            </div>
          );
        }}
      </EditableFieldValue>
    </InfoContainerField>
  );
}

function RulesetField({
  data,
  onDataChanged,
}: {
  data: TournamentCompactDTO;
  onDataChanged: (data: TournamentCompactDTO) => void;
}) {
  return (
    <InfoContainerField label={'Ruleset'}>
      <EditableFieldValue
        data={data}
        target={'ruleset'}
        onDataChanged={onDataChanged}
      >
        {({
          editableRef,
          isEditable,
          isEditing,
          isSubmitting,
          value,
          submitValue,
        }) => {
          if (!isEditable || (isEditable && !isEditing)) {
            return (
              <div className={styles.value}>
                {RulesetMetadata[value].shortAlt}
              </div>
            );
          }

          return (
            <div ref={editableRef}>
              <DropdownRulesetSelector textFormat={'short'} />
            </div>
          );
        }}
      </EditableFieldValue>
    </InfoContainerField>
  );
}

function ForumPostField({
  data,
  onDataChanged,
}: {
  data: TournamentCompactDTO;
  onDataChanged: (data: TournamentCompactDTO) => void;
}) {
  return (
    <InfoContainerField label={'Forum post'}>
      <EditableFieldValue
        data={data}
        target={'forumUrl'}
        onDataChanged={onDataChanged}
      >
        {({
          editableRef,
          isEditable,
          isEditing,
          isSubmitting,
          value,
          setValue,
          submitValue,
        }) => {
          if (!isEditable || (isEditable && !isEditing)) {
            return (
              <div className={styles.value}>
                <Link href={value} target="_blank">
                  {value}
                </Link>
              </div>
            );
          }

          return (
            <input
              className={styles.value}
              ref={editableRef}
              type={'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) submitValue();
              }}
              autoFocus
              disabled={isSubmitting}
            />
          );
        }}
      </EditableFieldValue>
    </InfoContainerField>
  );
}
