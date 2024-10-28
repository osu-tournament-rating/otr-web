'use client';

import { statusButtonTypes } from '@/lib/types';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import styles from './StatusButton.module.css';

const dropdownVariants = {
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

const listItemVariants = {
  initial: {
    y: -10,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      staggerChildren: 'after',
    },
  },
  exit: {
    y: -10,
    opacity: 0,
  },
};

export default function StatusButton({
  status,
  canChange = false,
  path,
  id,
}: {
  status: number;
  canChange: boolean;
  path: string;
  id: string | number;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isOpen, setIsOpen] = useState(false);

  const statusClick = async (intStatus) => {
    const res = await intStatus.function({
      status: intStatus.verificationValue,
      path: path,
      id: id,
    });
    setIsOpen(false);

    if (!res.error) {
      setCurrentStatus(res.verificationStatus);
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={clsx(
          styles.button,
          styles[statusButtonTypes[currentStatus]?.className],
          canChange ? styles.canChange : ''
        )}
        onClick={() => {
          canChange && setIsOpen((prev) => !prev);
        }}
      >
        <span className={styles.text}>
          {statusButtonTypes[currentStatus]?.text}
        </span>
        {canChange && (
          <motion.span
            className={styles.icon}
            animate={{
              rotate: isOpen ? -180 : 0,
              transition: {
                bounceStiffness: 100,
              },
            }}
          >
            <FontAwesomeIcon icon={faAngleDown} />
          </motion.span>
        )}
      </div>
      {canChange && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={dropdownVariants}
              initial={'initial'}
              animate={'animate'}
              exit={'exit'}
              className={styles.dropdown}
            >
              {Object.values(statusButtonTypes)
                .sort((a, b) => (a.order < b.order ? -1 : 1))
                .map((intStatus, index) => {
                  if (intStatus?.display) {
                    return (
                      <motion.div
                        key={index}
                        className={styles.item}
                        variants={listItemVariants}
                        onClick={() => {
                          if (intStatus.function) {
                            statusClick(intStatus);
                          }
                        }}
                      >
                        {intStatus.text}
                      </motion.div>
                    );
                  }
                })}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
