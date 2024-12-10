import ExpandableRow from '../MainExpandableRow/MainExpandableRow';
import styles from './Lists.module.css';

export default function AdminTournamentsList({
  params,
  data,
}: {
  params: {};
  data: {};
}) {
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
