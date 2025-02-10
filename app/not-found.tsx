import Image from 'next/image';
import styles from './error.module.css';

const errorBackground = '/images/error-background.svg';

export default function NotFound() {
  return (
    <div className={styles.errorDiv}>
      <Image src={errorBackground} alt="Error background" fill />
      <div className={styles.content}>
        <h1>404</h1>
        <span>We don&apos;t have that page</span>
      </div>
    </div>
  );
}
