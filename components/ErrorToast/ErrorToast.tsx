import { motion } from 'framer-motion';
import styles from './ErrorToast.module.css';

export default function ErrorToast({
  status,
  text,
  message,
}: {
  status: number;
  text: string;
  message: string;
}) {
  const initial = {
    translateY: '0.5em',
    opacity: 0,
  };

  const animate = {
    translateY: '-1em',
    opacity: 1,
  };

  const exit = {
    translateY: '1em',
    opacity: 0,
  };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      className={styles.toast}
    >
      <div className={styles.header}>
        <span>{status}</span>
        <span>{text}</span>
      </div>
      <div className={styles.body}>{message}</div>
    </motion.div>
  );
}
