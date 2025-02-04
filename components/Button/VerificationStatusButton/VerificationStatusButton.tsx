'use client';

import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { Ref, useState } from 'react';
import styles from './VerificationStatusButton.module.css';
import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';
import { useClickAway } from '@uidotdev/usehooks';
import { VerificationStatusMetadata } from '@/lib/enums';

/** Motion animation variants for the dropdown button */
const dropdownVariants: Variants = {
  initial: {
    y: -10,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    y: -10,
    opacity: 0,
  },
};

/** Motion animation variants for the dropdown list items */
const listItemVariants: Variants = {
  initial: {
    y: -10,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
  exit: {
    y: -10,
    opacity: 0,
  },
};

type VerificationStatusButtonProps = {
  /** Initial status to display */
  initialStatus: VerificationStatus;

  /**
   * If true, enables the dropdown selection of a new status
   * TODO: Change this to something like 'enableDropdown'
   */
  isAdminView?: boolean;

  /**
   * An event fired when the verification status is changed.
   * Only used if {@link isAdminView} is true
   */
  onChange?: (newStatus: VerificationStatus) => Promise<void> | void;
};

export default function VerificationStatusButton({
  initialStatus,
  isAdminView,
  onChange,
}: VerificationStatusButtonProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const ref = useClickAway(() => {
    setIsOpen(false);
  }) as Ref<any>;

  const handleStatusChange = async (newStatus: VerificationStatus) => {
    setIsOpen(false);
    setIsLoading(true);

    try {
      if (onChange) {
        await onChange(newStatus);
        setCurrentStatus(newStatus);
        // Toast for success
      }
    } catch {
      // Toast for error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container} ref={ref}>
      <div
        className={clsx(
          styles.button,
          styles[VerificationStatusMetadata[currentStatus].className],
          isAdminView ? styles.canOpen : '',
          isLoading && styles.loading
        )}
        onClick={() => {
          if (isAdminView && !isLoading) setIsOpen((prev) => !prev);
        }}
      >
        <span className={styles.text}>
          {VerificationStatusMetadata[currentStatus].text}
        </span>
        {isAdminView && (
          <motion.span
            className={styles.icon}
            animate={{
              rotate: isOpen ? -180 : 0,
              transition: { bounceStiffness: 100 },
            }}
          >
            <FontAwesomeIcon icon={faAngleDown} />
          </motion.span>
        )}
      </div>
      {isAdminView && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={styles.dropdown}
              variants={dropdownVariants}
              initial={'initial'}
              animate={'animate'}
              exit={'exit'}
            >
              {Object.entries(VerificationStatusMetadata).map(
                ([value, { text, displayInDropdown }]) => {
                  if (
                    displayInDropdown &&
                    !((value as any as VerificationStatus) == currentStatus)
                  ) {
                    return (
                      <motion.div
                        key={value}
                        className={styles.item}
                        variants={listItemVariants}
                        onClick={() =>
                          !isLoading &&
                          handleStatusChange(value as any as VerificationStatus)
                        }
                      >
                        {text}
                      </motion.div>
                    );
                  }
                }
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
