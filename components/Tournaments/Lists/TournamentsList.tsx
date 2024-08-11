'use client';

import Pagination from '@/components/Pagination/Pagination';
import { modeIcons } from '@/lib/types';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
import Link from 'next/link';
import { Tooltip } from 'react-tooltip';
import styles from './Lists.module.css';

export default function TournamentsList({
  params,
  data,
}: {
  params: {};
  data: {};
}) {
  //! to remove, just to avoid massive data on the page
  data.length = 5;

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
                    <Tooltip
                      id={`tooltip-${tournament.mode}`}
                      style={{
                        padding: '0.6em 1.2em',
                        borderRadius: '0.6em',
                        fontWeight: '500',
                        background: 'hsl(0,0%,82%)',
                        color: '#333',
                      }}
                    />
                    <Image
                      data-tooltip-id={`tooltip-${tournament.mode}`}
                      data-tooltip-content={
                        modeIcons[tournament.mode]?.altTournamentsList
                      }
                      data-tooltip-delay-show={400}
                      src={modeIcons[tournament.mode].image}
                      alt={modeIcons[tournament.mode].altTournamentsList}
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
