'use client';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <div className={styles.footer}>
      <div className={styles.copyright}>© o!TR 2024</div>
      <div className={styles.actions}>
        <span>Staff</span>
        <span>Privacy</span>
        <span>Contact</span>
      </div>
    </div>
  );
}
