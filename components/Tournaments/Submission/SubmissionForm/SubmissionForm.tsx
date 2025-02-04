'use client';

import { tournamentSubmissionFormAction } from '@/app/actions/tournaments';
import Form from '@/components/Form/Form';
import FormInputError from '@/components/Form/InputError/InputError';
import InfoIcon from '@/components/Icons/InfoIcon/InfoIcon';
import Toast from '@/components/Toast/Toast';
import { isAdmin } from '@/lib/api';
import { keysOf } from '@/util/forms';
import {
  Ruleset,
  TournamentSubmissionDTO,
} from '@osu-tournament-rating/otr-api-client';
import clsx from 'clsx';
import { useEffect, useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import styles from './SubmissionForm.module.css';
import { RulesetMetadata } from '@/lib/enums';
import { useUser } from '@/util/hooks';

const formId = 'tournament-submission-form';
const formFieldNames = keysOf<TournamentSubmissionDTO>();

function SubmitButton({ rulesAccepted }: { rulesAccepted: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" aria-disabled={pending || !rulesAccepted}>
      {pending ? <span aria-saving="true" /> : 'Submit'}
    </button>
  );
}

export default function SubmissionForm() {
  const [formState, formAction] = useActionState(
    tournamentSubmissionFormAction,
    {
      success: false,
      message: '',
      errors: {},
    }
  );
  const userIsAdmin = isAdmin(useUser().user?.scopes);

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Clear the form after successful submission
    if (formState.success) {
      (document.getElementById(formId) as HTMLFormElement).reset();
    }

    // If there is a message, display it in a toast
    if (formState.message !== '') {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 6000);
    }
  }, [formState]);

  return (
    <>
      <div className={styles.formContainer}>
        <Form action={formAction} id={formId}>
          <div className={styles.section}>
            <div className={styles.header}>
              <h1>Tournament Submission</h1>
              <p>
                Any tournament regardless of badge status may be submitted so
                long as it adheres to our submission guidelines.
              </p>
            </div>
            <div className={styles.fields}>
              <div className={styles.row}>
                {/* Name */}
                <div className={styles.field} id={styles[formFieldNames.name]}>
                  <label htmlFor={formFieldNames.name}>Name</label>
                  <FormInputError message={formState.errors.name} />
                  <input
                    required
                    type="text"
                    name={formFieldNames.name}
                    placeholder={'osu! World Cup 2023'}
                  />
                </div>
                {/* Abbreviation */}
                <div
                  className={styles.field}
                  id={styles[formFieldNames.abbreviation]}
                >
                  <label htmlFor={formFieldNames.abbreviation}>
                    Abbreviation
                  </label>
                  <FormInputError message={formState.errors.abbreviation} />
                  <input
                    required
                    type="text"
                    name={formFieldNames.abbreviation}
                    placeholder={'OWC2023'}
                  />
                </div>
              </div>
              <div className={styles.row}>
                {/* Forum post URL */}
                <div className={styles.field}>
                  <label htmlFor={formFieldNames.forumUrl}>
                    Forum post link
                  </label>
                  <FormInputError message={formState.errors.forumUrl} />
                  <input
                    required
                    type="url"
                    name={formFieldNames.forumUrl}
                    placeholder={'osu.ppy.sh/community/forums/topics/1234567'}
                  />
                </div>
              </div>
              <div className={styles.row}>
                {/* Ruleset */}
                <div className={styles.field}>
                  <label htmlFor={formFieldNames.ruleset}>Ruleset</label>
                  <FormInputError message={formState.errors.ruleset} />
                  <select required name={formFieldNames.ruleset}>
                    <option value={Ruleset.Osu}>
                      {RulesetMetadata[Ruleset.Osu].alt}
                    </option>
                    <option value={Ruleset.Taiko}>
                      {RulesetMetadata[Ruleset.Taiko].alt}
                    </option>
                    <option value={Ruleset.Catch}>
                      {RulesetMetadata[Ruleset.Catch].alt}
                    </option>
                    {userIsAdmin && (
                      <option value={Ruleset.ManiaOther}>
                        {RulesetMetadata[Ruleset.ManiaOther].alt}
                      </option>
                    )}
                    <option value={Ruleset.Mania4k}>
                      {RulesetMetadata[Ruleset.Mania4k].alt}
                    </option>
                    <option value={Ruleset.Mania7k}>
                      {RulesetMetadata[Ruleset.Mania7k].alt}
                    </option>
                  </select>
                </div>
                {/* Rank restriction */}
                <div className={styles.field}>
                  <label htmlFor={formFieldNames.rankRangeLowerBound}>
                    Rank restriction
                    <InfoIcon>
                      <p>
                        <span>
                          The best rank allowed to participate (after BWS if
                          used).
                          <br />
                          Ask us in the Discord if you&apos;re not sure.
                        </span>
                        <br />
                        <br />
                        <span>Examples:</span>
                        <ul style={{ paddingLeft: '1.2em' }}>
                          <li>Enter 1 for open rank tournaments</li>
                          <li>Enter 750 for a 750+ tournament</li>
                          <li>
                            If the tournament allows a team average rank, even
                            if open rank, enter the average (e.g. teams must be
                            750 rank average, enter 750)
                          </li>
                          <li>Enter 10000 for a 10k-50k tournament</li>
                        </ul>
                      </p>
                    </InfoIcon>
                  </label>
                  <FormInputError
                    message={formState.errors.rankRangeLowerBound}
                  />
                  <input
                    required
                    type="number"
                    name={formFieldNames.rankRangeLowerBound}
                    min={1}
                    placeholder={'1000'}
                  />
                </div>
                {/* Lobby size */}
                <div className={styles.field}>
                  <label htmlFor={formFieldNames.lobbySize}>
                    Lobby size
                    <InfoIcon>
                      <p>
                        <span>
                          The maximum number of players per team allowed in the
                          lobby at the same time. This is not the same as the
                          maximum roster size (Team Size / TS). Ask us in the
                          Discord if you&apos;re not sure.
                        </span>
                        <br />
                        <br />
                        <span>Examples:</span>
                        <ul style={{ paddingLeft: '1.2em' }}>
                          <li>1v1 TS 1 =&gt; 1v1</li>
                          <li>1v1 TS 4 =&gt; 1v1</li>
                          <li>3v3 TS 6 =&gt; 3v3</li>
                          <li>osu! World Cups: 4v4 TS 8 =&gt; 4v4</li>
                        </ul>
                      </p>
                    </InfoIcon>
                  </label>
                  <FormInputError message={formState.errors.lobbySize} />
                  <select required name={formFieldNames.lobbySize}>
                    <option value={1}>1v1</option>
                    <option value={2}>2v2</option>
                    <option value={3}>3v3</option>
                    <option value={4}>4v4</option>
                    <option value={5}>5v5</option>
                    <option value={6}>6v6</option>
                    <option value={7}>7v7</option>
                    <option value={8}>8v8</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          {/** MP links */}
          <div className={styles.section}>
            <div className={styles.header}>
              <h1>
                Match links
                <InfoIcon
                  infoText={
                    'One or more osu! multiplayer match links or ids, separated by a new line'
                  }
                />
              </h1>
            </div>
            <div className={styles.fields}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <FormInputError message={formState.errors.ids} />
                  <textarea
                    required
                    name={formFieldNames.ids}
                    placeholder={
                      'https://osu.ppy.sh/mp/111555364\nhttps://osu.ppy.sh/mp/111534249'
                    }
                    cols={30}
                    rows={6}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          {/** Mappool links */}
          <div className={styles.section}>
            <div className={styles.header}>
              <h1>
                Beatmap links
                {/** Info text is placeholder and should be replaced. Ideally when moving submission guidelines to docs */}
                <InfoIcon
                  infoText={
                    'Optionally include links to all beatmaps that were pooled by the tournament. This helps us greatly when verifying match data!'
                  }
                />
              </h1>
            </div>
            <div className={styles.fields}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <FormInputError message={formState.errors.beatmapIds} />
                  <textarea
                    name={formFieldNames.beatmapIds}
                    placeholder={'1 or more separated beatmap links'}
                    cols={30}
                    rows={6}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          {/** Accept rules and submit */}
          <div className={styles.section}>
            <div className={styles.fields}>
              {/** Rules checkbox */}
              <div className={clsx(styles.row, styles.checkbox)}>
                <input
                  required
                  type="checkbox"
                  name="rulesCheckBox"
                  id="rulesCheckBox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                />
                <span onClick={() => setRulesAccepted((prev) => !prev)}>
                  I have read the rules and understand that abusing tournament
                  submission can lead to a restriction
                </span>
              </div>
              <SubmitButton rulesAccepted={rulesAccepted} />
            </div>
          </div>
        </Form>
      </div>
      {showToast && (
        <Toast success={formState.success} message={formState.message} />
      )}
    </>
  );
}
