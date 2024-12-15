'use client';

import styles from './TournamentListFilter.module.css';
import { AnimationProps, motion } from 'framer-motion';
import clsx from 'clsx';
import RulesetSelector from '@/components/Button/RulesetSwitcher/RulesetSelector';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import VerificationStatusButton from '@/components/Button/VerificationStatusButton/VerificationStatusButton';
import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import { TournamentProcessingStatusMetadata } from '@/lib/enums';
import Select from 'react-select';
import { useTournamentListData } from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';

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
    overflow: 'hidden'
  },
  exit: {
    height: 0,
    opacity: 0,
    gap: 0,
    padding: '0 2rem',
    overflow: 'hidden',
  }
}

export default function TournamentListFilterCollapsible() {
  const { filter: { ruleset }, setFilterValue } = useTournamentListData()

  return (
    <motion.div
      className={clsx('content', styles.collapsible)}
      {...collapsibleAnimationProps}
    >
      <RulesetSelector
        initialRuleset={ruleset}
        onChange={value => setFilterValue('ruleset', value)}
      />
      {/**
       * Date range picker
       * I have no idea what is going on with the styling here :/
       */}
      <section className={styles.field}>
        <span>Start date from: </span>
        <DatePicker
          className={'formField'}
          showIcon
          timeInputLabel={'Time:'}
          dateFormat={'MM/dd/yyyy h:mm aa'}
          showTimeInput
        />
        <span> to </span>
        <DatePicker
          className={'formField'}
          showIcon
          timeInputLabel="Time:"
          dateFormat={'MM/dd/yyyy h:mm aa'}
          showTimeInput
        />
      </section>
      {/** Format dropdown */}
      <section className={styles.field}>
        <span>Format</span>
        <select>
          <option>Any</option>
          {[...Array(8)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{`${i + 1}v${i + 1}`}</option>
          ))}
        </select>
      </section>
      {/** Rank range slider */}
      <section className={styles.field}>
        <span>{'Rank Range {range slider here}'}</span>
        {/** TODO: Lots of bugs with the range slider */}
        {/*<RangeSlider*/}
        {/*  name={'rankRange'}*/}
        {/*  value={[]}*/}
        {/*  min={1}*/}
        {/*  max={100}*/}
        {/*  setParamsToPush={setParamsToPush}*/}
        {/*/>*/}
      </section>
      {/** Verified data checkbox */}
      <section className={styles.field}>
        <div className={styles.checkbox}>
          <FontAwesomeIcon icon={faCheck} />
        </div>
        <span>Show only verified data</span>
      </section>
      {/** Rejection reason dropdown */}
      <section className={styles.field}>
        <span>Rejection reason</span>
        <Select
          options={Object.entries(TournamentProcessingStatusMetadata).map(([value, { text }]) => {
            return { value, label: text };
          })}
          isMulti
        />
      </section>
      {/** Verification status dropdown */}
      <section className={styles.field}>
        <span>Verification status</span>
        <VerificationStatusButton initialStatus={VerificationStatus.None} isAdminView />
      </section>
      {/** Processing status dropdown */}
      <section className={styles.field}>
        <span>Processing status</span>
        <select>
          <option>Any</option>
          {Object.entries(TournamentProcessingStatusMetadata)
            .map(([value, { text, description }]) => (
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
      <section className={styles.field}>
        <span>Submitter (user id)</span>
        <input
          type='number'
          min={0}
        />
      </section>
      {/** Verifier */}
      <section className={styles.field}>
        <span>Verifier (user id)</span>
        <input
          type='number'
          min={0}
        />
      </section>
    </motion.div>
  );
}