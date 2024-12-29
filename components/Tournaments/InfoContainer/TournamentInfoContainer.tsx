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
import { useAdminViewContext } from '@/components/AdminViewContext/AdminViewContext';
import FormatSelector from '@/components/Tournaments/Submission/SubmissionForm/FormatSelector/FormatSelector';
import DropdownRulesetSelector
  from '@/components/Tournaments/Submission/SubmissionForm/DropdownRulesetSelector/DropdownRulesetSelector';

export default function TournamentInfoContainer({
  data,
  showName = false
}: {
  /** Tournament data */
  data: TournamentCompactDTO;
  /** Whether to show the tournament's name */
  showName?: boolean;
}) {
  const { isAdminView } = useAdminViewContext();

  return (
    <div className={styles.content}>
      {/** Verification Status */}
      {isAdminView && (
        <div className={styles.field} style={{ gridColumn: '1 / 3' }}>
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
      )}
      {/** Name */}
      {showName && (
        <div className={styles.field} id={styles.tournamentName}>
          <div className={styles.name}>Name</div>
          <div className={styles.value}>{data.name}</div>
        </div>
      )}
      {/** Abbreviation */}
      <AbbreviationField data={data} />
      {/** Format */}
      <FormatField data={data} />
      {/** Ruleset */}
      {/*<Field label={'Ruleset'}>*/}
      {/*  <div className={styles.value}>*/}
      {/*    {RulesetMetadata[data.ruleset].shortAlt}*/}
      {/*  </div>*/}
      {/*</Field>*/}
      <RulesetField data={data} />
      {/** Forum URL */}
      <ForumPostField data={data} />
      {/** Submitter */}
      <Field label={'Submitter'}>
        <div className={styles.value}>
          {data.submittedByUser ? (
            <Link href={`/players/${data.submittedByUser.player.id}`}>
              {data.submittedByUser.player.username}
            </Link>
          ) : (
            'Unknown submitter'
          )}
        </div>
      </Field>
      {/** Verifier */}
      <Field label={'Verifier'}>
        <div className={styles.value}>
          {data.verifiedByUser ? (
            <Link href={`/players/${data.verifiedByUser.player.id}`}>
              {data.verifiedByUser.player.username}
            </Link>
          ) : (
            'Unknown verifier'
          )}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <div className={styles.name}>{label}</div>
      {children}
    </div>
  )
}

// Acts as a state manager for editable values
function EditableFieldValue<K extends keyof TournamentCompactDTO>({
  data,
  target,
  children
}: {
  data: TournamentCompactDTO;
  target: K;
  children: ({
    editableRef,
    isEditable,
    isEditing,
    isSubmitting,
    value,
    setValue,
    submitValue
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
  }

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
        value: editableValue
      }).then((updatedTournament) => {
        setOriginalValue(updatedTournament[target]);
        setIsEditing(false);
      })
    } catch (e) {
      // TODO: Show error toast
      abortEdit();
    } finally {
      setIsSubmitting(false);
    }
  }

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
      {(isEditable && !isEditing) && (
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

function AbbreviationField({ data }: { data: TournamentCompactDTO }) {
  return (
    <Field label={'Abbreviation'}>
      <EditableFieldValue data={data} target={'abbreviation'}>
        {({ editableRef, isEditable, isEditing, isSubmitting, value, setValue, submitValue }) => {
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
                if (e.key === 'Enter' && !isSubmitting) submitValue()
              }}
              autoFocus
              disabled={isSubmitting}
            />
          );
        }}
      </EditableFieldValue>
    </Field>
  );
}

function FormatField({ data }: { data: TournamentCompactDTO }) {
  return (
    <Field label={'Format'}>
      <EditableFieldValue data={data} target={'lobbySize'}>
        {({ editableRef, isEditable, isEditing, isSubmitting, value, submitValue }) => {
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
    </Field>
  );
}

function RulesetField({ data }: { data: TournamentCompactDTO }) {
  return (
    <Field label={'Ruleset'}>
      <EditableFieldValue data={data} target={'ruleset'}>
        {({ editableRef, isEditable, isEditing, isSubmitting, value, submitValue }) => {
          if (!isEditable || (isEditable && !isEditing)) {
            return <div className={styles.value}>{RulesetMetadata[value].shortAlt}</div>;
          }

          return (
            <div ref={editableRef}>
              <DropdownRulesetSelector textFormat={'short'} />
            </div>
          );
        }}
      </EditableFieldValue>
    </Field>
  );
}

function ForumPostField({ data }: { data: TournamentCompactDTO }) {
  return (
    <Field label={'Forum post'}>
      <EditableFieldValue data={data} target={'forumUrl'}>
        {({ editableRef, isEditable, isEditing, isSubmitting, value, setValue, submitValue }) => {
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
                if (e.key === 'Enter' && !isSubmitting) submitValue()
              }}
              autoFocus
              disabled={isSubmitting}
            />
          );
        }}
      </EditableFieldValue>
    </Field>
  );
}