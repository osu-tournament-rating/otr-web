'use client';

import Pagination from '@/components/Pagination/Pagination';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import styles from './TournamentsList.module.css';

export default function TournamentsList({
  params,
  data,
}: {
  params: {};
  data: {};
}) {
  return (
    <div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Format</th>
            <th>Ruleset</th>
            <th>
              Date <FontAwesomeIcon icon={faAngleDown} />
            </th>
          </tr>
        </thead>
        <tbody>
          {/* {data.leaderboard.map((player, index) => {
            return (
              <tr
                key={index}
              >
                <td>Porco tournament</td>
                <td>dasd3</td>
                <td>sdoa</td>
                <td>test</td>
              </tr>
            );
          })} */}
          <tr
          /* key={index} */
          >
            <td>Porco tournament</td>
            <td>dasd3</td>
            <td>sdoa</td>
            <td>test</td>
          </tr>
        </tbody>
      </table>
      {/* <Pagination
        pageSize={25}
        totalCount={data.totalPlayerCount}
        params={params}
      /> */}
    </div>
  );
}
