import Link from 'next/link';
import ExpandableRow from '../MainExpandableRow/MainExpandableRow';
import styles from './Lists.module.css';

export default function AdminTournamentsList({
  params,
  data,
}: {
  params: {};
  data: {};
}) {
  //! to remove, just to avoid massive data on the page
  data.length = 30;

  return (
    <div className={styles.gridList}>
      <div className={styles.row}>
        <span>Name</span>
        <span>Format</span>
        <span>Ruleset</span>
        <span>Submitter</span>
        <span>Date</span>
      </div>
      {data.map((tournament, index) => {
        return <ExpandableRow key={index} tournament={tournament} />;
      })}
    </div>
  );
}
