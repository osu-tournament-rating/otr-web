'use client';
import { faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './OpenFiltersButton.module.css';

export default function OpenFiltersButton({
  isCollapsibleOpen,
  setIsCollapsibleOpen,
}: {
  isCollapsibleOpen: boolean;
  setIsCollapsibleOpen: any;
}) {
  return (
    <button
      className={styles.button}
      onClick={() => setIsCollapsibleOpen((prev: boolean) => !prev)}
    >
      <span>Filters</span>
      <FontAwesomeIcon
        icon={faAngleRight}
        className={isCollapsibleOpen ? styles.open : ''}
      />
    </button>
  );
}
