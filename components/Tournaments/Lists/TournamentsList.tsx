'use client';

import Pagination from '@/components/Pagination/Pagination';
import { modeIcons } from '@/lib/types';
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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

  const [sorting, setSorting] = useState({ name: 'name', direction: 'desc' });

  const changeSorting = (sortName: string) => {
    setSorting(({ name, direction }) => ({
      name: sortName,
      direction:
        sortName === name ? (direction === 'desc' ? 'asc' : 'desc') : 'desc',
    }));
  };

  useEffect(() => {
    if (sorting) {
      data.sort((a, b) => {
        if (a[sorting.name] < b[sorting.name]) {
          return sorting.direction === 'asc' ? 1 : -1;
        } else if (a[sorting.name] > b[sorting.name]) {
          return sorting.direction === 'asc' ? -1 : 1;
        }

        return 0;
      });
    }
  }, [data, sorting]);

  return (
    <div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th onClick={() => changeSorting('name')}>
              Name
              {sorting.name === 'name' && (
                <FontAwesomeIcon
                  icon={sorting.direction === 'asc' ? faAngleUp : faAngleDown}
                />
              )}
            </th>
            <th onClick={() => changeSorting('teamSize')}>
              Format
              {sorting.name === 'teamSize' && (
                <FontAwesomeIcon
                  icon={sorting.direction === 'asc' ? faAngleUp : faAngleDown}
                />
              )}
            </th>
            <th onClick={() => changeSorting('mode')}>
              Ruleset
              {sorting.name === 'mode' && (
                <FontAwesomeIcon
                  icon={sorting.direction === 'asc' ? faAngleUp : faAngleDown}
                />
              )}
            </th>
            <th onClick={() => changeSorting('date')}>
              Date
              {sorting.name === 'date' && (
                <FontAwesomeIcon
                  icon={sorting.direction === 'asc' ? faAngleUp : faAngleDown}
                />
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((tournament, index) => {
            const format = `${tournament.teamSize}v${tournament.teamSize}`;

            return (
              <tr key={index}>
                <td>
                  <Link href={`/tournaments/${tournament.id}`}>
                    {tournament.name}
                  </Link>
                </td>
                <td>{format}</td>
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
