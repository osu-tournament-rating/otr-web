import { faClose } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useClickAway } from '@uidotdev/usehooks';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './Modal.module.css';
import { ReactNode } from 'react';

const transition = {
  type: 'ease-out',
  duration: 0.12,
  bounce: 0,
};

const containerVariants = {
  initial: {
    backgroundColor: 'rgba(0,0,0,0)',
  },
  animate: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    transition: {
      duration: 0.1,
      type: 'ease-out',
    },
  },
  exit: {
    backgroundColor: 'rgba(0,0,0,0)',
    transition: {
      duration: 0.2,
      type: 'ease-out',
    },
  },
};

const modalVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

export default function Modal({
  isOpen,
  setIsOpen,
  title,
  children,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useClickAway<HTMLDivElement>(() => {
    setIsOpen(false);
  });

  return (
    <AnimatePresence mode="wait" key={'modal-presence'}>
      {isOpen && (
        <motion.div
          variants={containerVariants}
          initial={'initial'}
          animate={'animate'}
          exit={'exit'}
          key={'modal'}
          className={styles.modalContainer}
        >
          <motion.div
            variants={modalVariants}
            transition={transition}
            className={styles.modal}
            ref={ref}
          >
            <div className={styles.header}>
              <h2>{title}</h2>
              <div
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
              >
                <FontAwesomeIcon icon={faClose} />
              </div>
            </div>
            <div className={styles.content}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
