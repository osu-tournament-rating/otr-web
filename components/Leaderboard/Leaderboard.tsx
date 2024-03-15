'use client';
import { useUser } from '@/util/hooks';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
import Link from 'next/link';
import FormattedNumber from '../FormattedNumber/FormattedNumber';
import Pagination from '../Pagination/Pagination';
import styles from './Leaderboard.module.css';

export default function Leaderboard({
  params,
  data,
}: {
  params: {};
  data: {};
}) {
  const user = useUser();

  return (
    <div className={styles.leaderboardContainer} id="leaderboard">
      <div className={styles.header}>
        <FormattedNumber number={data.totalPlayerCount} />
        Players
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>
              Rank <FontAwesomeIcon icon={faAngleDown} />
            </th>
            <th>Player</th>
            <th>Tier</th>
            <th>Rating</th>
            <th>Matches</th>
            <th>Winrate</th>
          </tr>
        </thead>
        <tbody>
          {data.leaderboard.map((player, index) => {
            return (
              <tr
                className={user?.id === player.playerId ? styles.me : ''}
                key={index}
              >
                <td>#{player.globalRank}</td>
                <td>
                  <Link href={`/users/${player.playerId}`}>
                    <div className={styles.propic}>
                      <Image
                        src={`http://a.ppy.sh/${player.osuId}`}
                        alt={`${player.name}'s Propic`}
                        fill
                      />
                    </div>
                    {player.name}
                  </Link>
                </td>
                <td>
                  <div className={styles.rank}>
                    <Image
                      src={`/icons/ranks/${player.tier}.svg`}
                      alt={player.tier}
                      style={
                        player.tier === 'Elite Grandmaster'
                          ? { padding: '0.25em' }
                          : player.tier.includes('Silver')
                          ? {
                              filter:
                                'drop-shadow(rgba(0, 0, 0, 0.1) 0px 0.2px 0.2px)',
                            }
                          : {}
                      }
                      fill
                    />
                  </div>
                </td>
                <td>{Math.floor(player.rating)}</td>
                <td>{player.matchesPlayed}</td>
                <td>{(player.winRate * 100).toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination
        pageSize={25}
        totalCount={data.totalPlayerCount}
        params={params}
      />
    </div>
  );
}
