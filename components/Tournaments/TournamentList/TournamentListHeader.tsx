'use client';

import styles from './TournamentList.module.css';
import clsx from 'clsx';
import { TournamentQuerySortType } from '@osu-tournament-rating/otr-api-client';
import { useTournamentListData } from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';
import { faAngleUp, faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function TournamentListHeader() {
  return (
    <div className={clsx(styles.row, styles.collapsed, styles.headings)}>
      <span>Name</span>
      <SortableHeader targetSort={TournamentQuerySortType.LobbySize}>
        Format
      </SortableHeader>
      <span>Ruleset</span>
      <span>Submitter</span>
      <SortableHeader targetSort={TournamentQuerySortType.StartTime}>
        Start Date
      </SortableHeader>
      <SortableHeader targetSort={TournamentQuerySortType.EndTime}>
        End Date
      </SortableHeader>
    </div>
  );
}

function SortableHeader({
  targetSort,
  children
}: {
  targetSort: TournamentQuerySortType;
  children: string;
}) {
  const {
    filter: { sort, descending },
    setFilterValue,
  } = useTournamentListData();
  const isSorting = sort === targetSort;

  const handleClick = () => {
    if (isSorting) {
      setFilterValue('descending', !descending);
    } else {
      setFilterValue('sort', targetSort);
    }
  }

  return (
    <span className={styles.sortableHeader} onClick={handleClick}>
      {children}
      {isSorting && (descending
        ? (<FontAwesomeIcon icon={faAngleDown} />)
        : (<FontAwesomeIcon icon={faAngleUp} />)
      )}
    </span>
  );
}