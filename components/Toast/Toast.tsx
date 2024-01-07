import clsx from 'clsx';
import styles from './Toast.module.css';

export default function Toast({
  status,
  message,
}: {
  status: string;
  message: string;
}) {
  return (
    <div
      className={clsx(
        styles.toast,
        status === 'success'
          ? styles.success
          : status === 'error'
          ? styles.error
          : ''
      )}
    >
      {message}
    </div>
  );
}
