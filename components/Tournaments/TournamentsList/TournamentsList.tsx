'use client';

import Pagination from '@/components/Pagination/Pagination';
import { modeIcons } from '@/lib/types';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
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
          {data.map((tournament, index) => {
            return (
              <tr key={index}>
                <td>
                  <Link href={`/tournaments/${tournament.id}`}>
                    {tournament.name}
                  </Link>
                </td>
                <td>Missing format</td>
                <td>
                  <div className={styles.rulesetIcon}>
                    <Image
                      src={modeIcons[tournament.mode].image}
                      alt={modeIcons[tournament.mode].alt}
                      fill
                    />
                  </div>
                </td>
                <td>Missing starting date</td>
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
