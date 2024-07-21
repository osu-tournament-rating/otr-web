'use client';
import clsx from 'clsx';
import { usePathname, useRouter } from 'next/navigation';
import styles from './FilterChangeButton.module.css';

export default function FilterChangeButton({
  text,
  value,
  isSelected,
}: {
  text: string;
  isSelected: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <button
      className={clsx(styles.button, isSelected ? styles.selected : '')}
      onClick={() =>
        router.push(`${pathname}${value !== '' ? `?time=${value}` : ''}`)
      }
    >
      {text}
    </button>
  );
}
