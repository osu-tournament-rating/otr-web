'use client';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import styles from './FilterChangeButton.module.css';

export default function FilterChangeButton({
  text,
  isSelected,
}: {
  text: string;
  isSelected: boolean;
}) {
  return (
    <button className={clsx(styles.button, isSelected ? styles.selected : '')}>
      {text}
    </button>
  );
}
