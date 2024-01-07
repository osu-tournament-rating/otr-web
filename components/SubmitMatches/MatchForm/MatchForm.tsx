'use client';

import { saveTournamentMatches } from '@/app/actions';
import Form from '@/components/Form/Form';
import InfoIcon from '@/components/Form/InfoIcon/InfoIcon';
import Toast from '@/components/Toast/Toast';
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

export default function MatchForm({ userRoles }: { userRoles: Array<string> }) {
  const [state, formAction] = useFormState(saveTournamentMatches, initialState);

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [verifierAccepted, setVerifierAccepted] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Shows toast for both success or error, but need better implementation for errors
    /* if (state?.status) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 6000);
    } */

    if (state?.status === 'success') {
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
              <h1>Tournament</h1>
              <p>
                We’re currently prioritizing badged tournaments, but you can
                submit an unbadged tournament as well as long as it follows the
                rules.
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
                    <option value={0}>osu!Standard</option>
                    <option value={1}>osu!Taiko</option>
                    <option value={2}>osu!Catch</option>
                    <option value={3}>osu!Mania</option>
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
                    <InfoIcon
                      infoText={`The best rank allowed to participate -- for example, enter 10000 for a 10k-50k tournament and 1 for an open rank tournament. For a tiered tournament, use the best tier's rank, and for a tournament with an average rank requirement, enter that requirement (e.g. enter 500 for "average rank must be 500 or greater"). If the requirements are more complicated, ask in the o!TR server!`}
                    />
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
                    Team size
                    <InfoIcon>
                      <p>
                        The number of <i>players per team</i> that play in match
                        at a time -- for example, enter 3 for a 3v3 team size 6
                        tournament and 1 for a 1v1. Remember not to include
                        battle royale matches or matches that are played in
                        head-to-head mode with more than two players.
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
              {(userRoles.includes('MatchVerifier') ||
                userRoles.includes('Admin')) && (
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
          status={state?.status}
          message={
            state?.status === 'success'
              ? 'Tournament submitted successfully'
              : state?.status === 'error'
              ? state?.errors[0]
              : ''
          }
        />
      )}
    </>
  );
}
