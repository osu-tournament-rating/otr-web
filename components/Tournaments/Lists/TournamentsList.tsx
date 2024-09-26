'use client';

import Pagination from '@/components/Pagination/Pagination';
import { dateFormatOptions, modeIcons } from '@/lib/types';
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  //! to remove, just to avoid massive data on the page
  data.length = 30;

  const [sorting, setSorting] = useState({ name: 'date', direction: 'desc' });

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
            <th onClick={() => changeSorting('format')}>
              Format
              {sorting.name === 'format' && (
                <FontAwesomeIcon
                  icon={sorting.direction === 'asc' ? faAngleUp : faAngleDown}
                />
              )}
            </th>
            <th onClick={() => changeSorting('ruleset')}>
              Ruleset
              {sorting.name === 'ruleset' && (
                <FontAwesomeIcon
                  icon={sorting.direction === 'asc' ? faAngleUp : faAngleDown}
                />
              )}
            </th>
            {pathname === '/admin' && (
              <th onClick={() => changeSorting('user')}>
                User
                {sorting.name === 'user' && (
                  <FontAwesomeIcon
                    icon={sorting.direction === 'asc' ? faAngleUp : faAngleDown}
                  />
                )}
              </th>
            )}
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
            const format = `${tournament?.lobbySize}v${tournament?.lobbySize}`;
            const IconComponent = modeIcons[tournament?.ruleset]?.image;

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
                      id={`tooltip-${tournament.ruleset}`}
                      style={{
                        padding: '0.6em 1.2em',
                        borderRadius: '0.6em',
                        fontWeight: '500',
                        background: 'hsl(0,0%,82%)',
                        color: '#333',
                      }}
                    />
                    {IconComponent && (
                      <IconComponent
                        className="fill"
                        data-tooltip-id={`tooltip-${tournament.ruleset}`}
                        data-tooltip-content={
                          modeIcons[tournament.ruleset]?.altTournamentsList
                        }
                        data-tooltip-delay-show={400}
                      />
                    )}
                  </div>
                </td>
                {pathname === '/admin' && <td>missing user</td>}
                <td>
                  {new Date(tournament.startTime).toLocaleDateString(
                    'en-US',
                    dateFormatOptions.tournaments.listItem
                  )}
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
