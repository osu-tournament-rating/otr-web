'use client';

import RulesetSelector from '@/components/Button/RulesetSelector/RulesetSelector';
import VerificationStatusButton from '@/components/Button/VerificationStatusButton/VerificationStatusButton';
import RangeSlider from '@/components/Range/RangeSlider';
import FormatSelector from '@/components/Tournaments/Submission/SubmissionForm/FormatSelector/FormatSelector';
import { useTournamentListData } from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';
import { TournamentProcessingStatusMetadata } from '@/lib/enums';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import clsx from 'clsx';
import { AnimationProps, motion } from 'framer-motion';
import styles from './TournamentListFilter.module.css';

// TODO: Clean up this animation
const collapsibleAnimationProps: AnimationProps = {
  initial: {
    height: 0,
    opacity: 0,
    gap: 0,
    padding: '0 2rem',
    overflow: 'hidden',
  },
  animate: {
    height: 'auto',
    opacity: 1,
    gap: 'var(--internal-gap)',
    padding: '1.2rem 2rem',
    overflow: 'hidden',
  },
  exit: {
    height: 0,
    opacity: 0,
    gap: 0,
    padding: '0 2rem',
    overflow: 'hidden',
  },
};

export default function TournamentListFilterCollapsible() {
  const {
    filter: { ruleset },
    setFilterValue,
  } = useTournamentListData();

  return (
    <motion.div
      className={clsx('content', styles.collapsible)}
      {...collapsibleAnimationProps}
    >
      <section
        className={clsx(styles.containerField, styles.fill, styles.centered)}
      >
        <RulesetSelector
          initialRuleset={ruleset}
          onChange={(value) => setFilterValue('ruleset', value)}
        />
      </section>
      {/** Date range picker */}
      <section className={styles.containerField}>
        <span className={styles.label}>Date</span>
        <div className={styles.field}>
          <input type="date" name="startDate" id="startDate" />
          <span>to</span>
          <input type="date" name="endDate" id="endDate" />
        </div>
      </section>
      {/** Rank range slider */}
      <section className={styles.containerField}>
        <span className={styles.label}>{'Rank Range'}</span>
        {/** TODO: Implement the correct change to the object that changes the URL, passing the correct function to setParamsToPush */}
        <RangeSlider
          name={'rankRange'}
          min={1}
          max={100}
          setParamsToPush={setFilterValue}
        />
      </section>
      {/** Format dropdown */}
      <section className={styles.containerField}>
        <span className={styles.label}>Format</span>
        <FormatSelector showAnyOption />
      </section>
      {/** Rejection reason dropdown */}
      <section className={styles.containerField}>
        <span className={styles.label}>Rejection reason</span>
        <select /* multiple */>
          {/* //? have to be multiple? */}
          {Object.entries(TournamentProcessingStatusMetadata).map(
            ([value, { text }]) => {
              return (
                <option key={value} value={value}>
                  {text}
                </option>
              );
            }
          )}
        </select>
      </section>
      {/** Verification status dropdown */}
      <section className={styles.containerField}>
        <span className={styles.label}>Verification status</span>
        <VerificationStatusButton
          initialStatus={VerificationStatus.None}
          isAdminView
        />
      </section>
      {/** Processing status dropdown */}
      <section className={styles.containerField}>
        <span className={styles.label}>Processing status</span>
        <select>
          <option>Any</option>
          {Object.entries(TournamentProcessingStatusMetadata).map(
            ([value, { text, description }]) => (
              <option
                key={value}
                value={value}
                /**
                 * TODO: Set the 'data-tooltip-content' content of the parent
                 * <select> so hovering the closed selector shows the tooltip
                 * content of the currently selected option
                 */
                data-tooltip-id={'processing-status-tooltip'}
                data-tooltip-content={description}
              >
                {text}
              </option>
            )
          )}
        </select>
      </section>
      {/** Submitter */}
      <section className={styles.containerField}>
        <span className={styles.label}>Submitter (user id)</span>
        <input type="number" min={0} placeholder="4001304" />
      </section>
      {/** Verifier */}
      <section className={styles.containerField}>
        <span className={styles.label}>Verifier (user id)</span>
        <input type="number" min={0} placeholder="4001304" />
      </section>
      {/** Verified data checkbox */}
      <section
        className={clsx(styles.containerField, styles.fill, styles.centered)}
      >
        <div className={styles.field}>
          <span>Show only verified data</span>
          <div className={styles.checkbox}>
            <FontAwesomeIcon icon={faCheck} />
          </div>
        </div>
      </section>
    </motion.div>
  );
}
