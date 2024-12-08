'use client';

import Pagination from '@/components/Pagination/Pagination';
import StatusButton from '@/components/Button/StatusButton/StatusButton';
import { dateFormatOptions } from '@/lib/types';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import styles from './Lists.module.css';

export default function MatchesList({ data }: { data: {} }) {
  return (
    <div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Match</th>
            <th>Score</th>
            <th>
              Date <FontAwesomeIcon icon={faAngleDown} />
            </th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((match, index) => {
            return (
              <tr key={index}>
                <td>
                  <Link href={`/matches/${match.id}`}>{match.name}</Link>
                </td>
                <td>Missing data</td>
                <td>
                  {new Date(match.startTime).toLocaleDateString(
                    'en-US',
                    dateFormatOptions.tournaments.listItem
                  )}
                </td>
                <td className={styles.status}>
                  <StatusButton initialStatus={match.verificationStatus} />
                </td>
              </tr>
            );
          })}
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
