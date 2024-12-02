import clsx from 'clsx';
import styles from './Toast.module.css';

export default function Toast({
  success,
  message,
}: {
  success: boolean;
  message: string;
}) {
  return (
    <div className={clsx(styles.toast, success ? styles.success : styles.error)}>
      {message}
    </div>
  );
}
