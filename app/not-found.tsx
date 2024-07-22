import backgroundError from '@/public/images/error-background.svg';
import Image from 'next/image';
import Link from 'next/link';
import styles from './error.module.css';

export default function NotFound() {
  return (
    <div className={styles.errorDiv}>
      <Image src={backgroundError} alt="Error background" fill />
      <div className={styles.content}>
        <h1>404</h1>
        <span>We don&apos;t have that page</span>
      </div>
    </div>
  );
}
