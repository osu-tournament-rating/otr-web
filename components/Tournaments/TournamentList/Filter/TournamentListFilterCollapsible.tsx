'use client';

import RulesetSelector from '@/components/Button/RulesetSelector/RulesetSelector';
import RangeSlider from '@/components/Range/RangeSlider';
import FormatSelector from '@/components/Tournaments/Submission/SubmissionForm/FormatSelector/FormatSelector';
import { useTournamentListFilter } from '@/components/Context/TournamentListFilterContext';
import {
  getEnumFlags,
  TournamentProcessingStatusEnumHelper,
  TournamentRejectionReasonEnumHelper,
  VerificationStatusMetadata,
} from '@/lib/enums';
import { TournamentRejectionReason } from '@osu-tournament-rating/otr-api-client';
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
    filter: { verified },
  } = useTournamentListFilter();

  return (
    <motion.div
      className={clsx('content', styles.collapsible)}
      {...collapsibleAnimationProps}
    >
      <RulesetSelectorSection />
      <DateRangeSection />
      <RankRangeSection />
      <FormatSection />
      <SubmitterSection />
      <VerifierSection />
      <VerifiedOnlyCheckbox />
      {!verified && (
        <>
          <RejectionReasonSection />
          <VerificationStatusSection />
          <ProcessingStatusSection />
        </>
      )}
    </motion.div>
  );
}

function RulesetSelectorSection() {
  const {
    filter: { ruleset },
    setFilterValue,
  } = useTournamentListFilter();

  return (
    <section
      className={clsx(styles.containerField, styles.fill, styles.centered)}
    >
      <RulesetSelector
        initialRuleset={ruleset}
        onChange={(value) => setFilterValue('ruleset', value)}
      />
    </section>
  );
}

function DateRangeSection() {
  const {
    filter: { dateMin, dateMax },
    setFilterValue,
  } = useTournamentListFilter();

  return (
    <section className={styles.containerField}>
      <span className={styles.label}>Date</span>
      <div className={styles.field}>
        <input type="date" name="startDate" id="startDate" />
        <span>to</span>
        <input type="date" name="endDate" id="endDate" />
      </div>
    </section>
  );
}

function RankRangeSection() {
  return (
    <section className={styles.containerField}>
      <span className={styles.label}>{'Rank Range'}</span>
      <RangeSlider
        min={1}
        max={100000}
        // TODO: Pending API support
        // onChange={() => {
        //   setFilterValue()
        // }}
      />
    </section>
  );
}

function FormatSection() {
  const {
    filter: { lobbySize },
    setFilterValue,
  } = useTournamentListFilter();

  return (
    <section className={styles.containerField}>
      <span className={styles.label}>Format</span>
      <FormatSelector
        value={lobbySize}
        showAnyOption
        onChange={(e) => {
          const value = parseInt(e.target.value);
          setFilterValue('lobbySize', isNaN(value) ? undefined : value);
        }}
      />
    </section>
  );
}

function RejectionReasonSection() {
  const {
    filter: { rejectionReason },
    setFilterValue,
  } = useTournamentListFilter();
  const flags = getEnumFlags(rejectionReason, TournamentRejectionReason);

  return (
    <section className={styles.containerField}>
      <span className={styles.label}>Rejection reason</span>
      <select
        multiple
        onChange={(e) => {
          const values = Array.from(
            e.target.selectedOptions,
            (option) => option.value
          ).map((v) => parseInt(v));

          let value: TournamentRejectionReason | undefined = undefined;
          if (values.length > 0) {
            value = TournamentRejectionReason.None;
            values.forEach((v) => {
              value! |= v;
            });
          }

          setFilterValue('rejectionReason', value);
        }}
      >
        {Object.entries(TournamentRejectionReasonEnumHelper.metadata).map(
          ([value, { text }]) => {
            return (
              <option
                selected={flags.includes(Number(value))}
                key={value}
                value={value}
              >
                {text}
              </option>
            );
          }
        )}
      </select>
    </section>
  );
}

function VerificationStatusSection() {
  const {
    filter: { verificationStatus },
    setFilterValue,
  } = useTournamentListFilter();

  return (
    <section className={styles.containerField}>
      <span className={styles.label}>Verification status</span>
      <select
        value={verificationStatus}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          setFilterValue(
            'verificationStatus',
            isNaN(value) ? undefined : value
          );
        }}
      >
        <option>Any</option>
        {Object.entries(VerificationStatusMetadata)
          .filter(([, { displayInDropdown }]) => displayInDropdown)
          .map(([value, { text }]) => (
            <option value={value} key={value}>
              {text}
            </option>
          ))}
      </select>
    </section>
  );
}

function ProcessingStatusSection() {
  const {
    filter: { processingStatus },
    setFilterValue,
  } = useTournamentListFilter();

  return (
    <section className={styles.containerField}>
      <span className={styles.label}>Processing status</span>
      <select
        value={processingStatus}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          setFilterValue('processingStatus', isNaN(value) ? undefined : value);
        }}
      >
        <option>Any</option>
        {Object.entries(TournamentProcessingStatusEnumHelper.metadata).map(
          ([value, { text }]) => (
            <option key={value} value={value}>
              {text}
            </option>
          )
        )}
      </select>
    </section>
  );
}

function SubmitterSection() {
  const {
    filter: { submittedBy },
    setFilterValue,
  } = useTournamentListFilter();

  return (
    <section className={styles.containerField}>
      <span className={styles.label}>Submitter (user id)</span>
      <input
        type={'number'}
        min={0}
        placeholder={'4001304'}
        value={submittedBy}
        onChange={(e) => {
          setFilterValue(
            'submittedBy',
            isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
          );
        }}
      />
    </section>
  );
}

function VerifierSection() {
  const {
    filter: { verifiedBy },
    setFilterValue,
  } = useTournamentListFilter();

  return (
    <section className={styles.containerField}>
      <span className={styles.label}>Verifier (user id)</span>
      <input
        type={'number'}
        min={0}
        placeholder={'4001304'}
        value={verifiedBy}
        onChange={(e) => {
          setFilterValue(
            'verifiedBy',
            isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber
          );
        }}
      />
    </section>
  );
}

function VerifiedOnlyCheckbox() {
  const {
    filter: { verified },
    setFilterValue,
  } = useTournamentListFilter();

  return (
    <section
      className={clsx(styles.containerField, styles.fill, styles.centered)}
    >
      <div className={styles.field}>
        <input
          type={'checkbox'}
          checked={verified}
          onChange={() => setFilterValue('verified', !verified)}
        />
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => setFilterValue('verified', !verified)}
        >
          Show only verified data
        </span>
      </div>
    </section>
  );
}
