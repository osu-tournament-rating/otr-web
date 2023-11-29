'use client';
/* import icon from '@/public/icons/info-icon.svg';
import Image from 'next/image'; */
import { faQuestion } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './InfoIcon.module.css';

export default function InfoIcon({
  infoText,
  children,
}: {
  infoText?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.infoIcon}>
      <FontAwesomeIcon icon={faQuestion} />
      {/* <Image src={icon} alt="Info" fill /> */}
      <div className={styles.tooltip}>{infoText || children}</div>
    </div>
  );
}
