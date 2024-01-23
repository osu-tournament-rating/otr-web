import provisionalImage from '@/public/icons/provisional.png';
import Image from 'next/image';
import styles from './provisionalBadge.module.css';

export default function ProvisionalBadge() {
  return (
    <div className={styles.badge}>
      <Image src={provisionalImage} alt="Provisional" fill />
    </div>
  );
}
