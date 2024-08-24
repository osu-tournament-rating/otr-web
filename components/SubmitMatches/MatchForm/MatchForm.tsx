'use client';

import { saveTournamentMatches } from '@/app/actions';
import Form from '@/components/Form/Form';
import InfoIcon from '@/components/Form/InfoIcon/InfoIcon';
import Toast from '@/components/Toast/Toast';
import { useSetError } from '@/util/hooks';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import styles from './MatchForm.module.css';

const initialState = {
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" aria-disabled={pending}>
      {pending ? <span aria-saving="true" /> : 'Submit'}
    </button>
  );
}

export default function MatchForm({
  userScopes,
}: {
  userScopes: Array<string>;
}) {
  const [state, formAction] = useFormState(saveTournamentMatches, initialState);

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [verifierAccepted, setVerifierAccepted] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const setError = useSetError();

  useEffect(() => {
    // Shows toast for both success or error, but need better implementation for errors
    /* if (state?.status) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 6000);
    } */

    if (state?.error) {
      setError(state?.error);
    }

    if (state?.success) {
      document.getElementById('tournament-form')?.reset();
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 6000);
    }

    return () => {};
  }, [state]);

  return (
    <>
      <div className={styles.formContainer}>
        <Form action={formAction}>
          <div className={styles.section}>
            <div className={styles.header}>
              <h1>Tournament Submission</h1>
              <p>
                Any tournament, regardless of badge status, may be submitted, so
                long as it follows our rules.
              </p>
            </div>
            <div className={styles.fields}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="gameMode">Game mode</label>
                  <span className={styles.inputError}>
                    {state?.errors?.mode}
                  </span>
                  <select name="gameMode" id={styles.gamemode} required={true}>
                    <option value={0}>osu!</option>
                    <option value={1}>osu!taiko</option>
                    <option value={2}>osu!catch</option>
                    <option value={4}>osu!mania 4K</option>
                    <option value={5}>osu!mania 7K</option>
                    <option value={3}>osu!mania (Other)</option>
                  </select>
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="forumPostURL">Forum post link</label>
                  <span className={styles.inputError}>
                    {state?.errors?.forumPost}
                  </span>
                  <input
                    required={true}
                    type="url"
                    name="forumPostURL"
                    id="forumPostURL"
                    placeholder={'osu.ppy.sh/community/forums/topics/1234567'}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="tournamentName">Tournament name</label>
                  <span className={styles.inputError}>
                    {state?.errors?.tournamentName}
                  </span>
                  <input
                    required={true}
                    type="text"
                    name="tournamentName"
                    id="tournamentName"
                    placeholder={'osu! World Cup 2023'}
                  />
                </div>
                <div
                  className={styles.field}
                  id={styles.tournamentAbbreviation}
                >
                  <label htmlFor="tournamentAbbreviation">Abbreviation</label>
                  <span className={styles.inputError}>
                    {state?.errors?.abbreviation}
                  </span>
                  <input
                    type="text"
                    required={true}
                    name="tournamentAbbreviation"
                    id="tournamentAbbreviation"
                    placeholder={'OWC2023'}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="rankRestriction">
                    Rank restriction{' '}
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
                  <span className={styles.inputError}>
                    {state?.errors?.rankRangeLowerBound}
                  </span>
                  <input
                    required={true}
                    min={1}
                    type="number"
                    name="rankRestriction"
                    id="rankRestriction"
                    placeholder={'1000'}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="teamSize">
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
                  <span className={styles.inputError}>
                    {state?.errors?.teamSize}
                  </span>
                  <select name="teamSize" id={styles.teamsize} required={true}>
                    <option value={1}>1v1</option>
                    <option value={2}>2v2</option>
                    <option value={3}>3v3</option>
                    <option value={4}>4v4</option>
                    <option value={5}>5v5</option>
                    <option value={6}>6v6</option>
                    <option value={7}>7v7</option>
                    <option value={8}>8v8</option>
                    {/* <option value={-1}>Other (even team size)</option> */}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.header}>
              <h1>
                Match links
                {/* // ? ADD INFO TO MATCH  */}
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
                  <span className={styles.inputError}>
                    {state?.errors?.ids}
                  </span>
                  <textarea
                    required={true}
                    name="matchLinks"
                    id="matchLinks"
                    placeholder="1 or more separated match links"
                    cols={30}
                    rows={6}
                  ></textarea>
                </div>
              </div>
              <div className={clsx(styles.row, styles.checkbox)}>
                <input
                  required={true}
                  type="checkbox"
                  name="rulesCheckBox"
                  id="rulesCheckBox"
                  /* defaultChecked={rulesAccepted} */
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                />
                <span onClick={() => setRulesAccepted(!rulesAccepted)}>
                  I read the rules and I understand that submitting irrelevant
                  matches can lead to a restriction
                </span>
              </div>
              {userScopes.includes('verifier') && (
                <div className={clsx(styles.row, styles.checkbox)}>
                  <input
                    type="checkbox"
                    name="verifierCheckBox"
                    id="verifierCheckBox"
                    checked={verifierAccepted}
                    onChange={(e) => {
                      console.log(e.target.checked);
                      setVerifierAccepted(e.target.checked);
                    }}
                  />
                  <span onClick={() => setVerifierAccepted(!verifierAccepted)}>
                    Force verify
                  </span>
                </div>
              )}
            </div>
            <div className={styles.field}>
              <span className={styles.inputError}>
                {state?.errors?.serverError}
              </span>
            </div>
            <SubmitButton />
          </div>
        </Form>
      </div>
      {showToast && (
        <Toast
          status={state?.success ? 'success' : ''}
          message={state?.success ? state?.success.message : ''}
        />
      )}
    </>
  );
}
