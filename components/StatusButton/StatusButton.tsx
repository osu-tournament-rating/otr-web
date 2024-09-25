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
}: {
  status: number;
  canChange: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.container}>
      <div
        className={clsx(
          styles.button,
          styles[statusButtonTypes[status]?.className],
          canChange ? styles.canChange : ''
        )}
        onClick={() => {
          canChange && setIsOpen((prev) => !prev);
        }}
      >
        <span className={styles.text}>{statusButtonTypes[status]?.text}</span>
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
                .map((status, index) => {
                  return (
                    <motion.div
                      key={index}
                      className={styles.item}
                      variants={listItemVariants}
                    >
                      {status.text}
                    </motion.div>
                  );
                })}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
