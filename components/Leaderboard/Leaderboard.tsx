'use client';
import { useUser } from '@/util/hooks';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
import Link from 'next/link';
import { Tooltip } from 'react-tooltip';
import FormattedNumber from '../FormattedData/FormattedNumber';
import Pagination from '../Pagination/Pagination';
import styles from './Leaderboard.module.css';
import { LeaderboardDTO } from '@osu-tournament-rating/otr-api-client';

export default function Leaderboard({
  params,
  data,
}: {
  params: object;
  data: LeaderboardDTO;
}) {
  const { user } = useUser();

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
            <th>Win rate</th>
          </tr>
        </thead>
        <tbody>
          {data.leaderboard.map((lbPlayerInfo, index) => {
            return (
              <tr
                className={
                  user?.id === lbPlayerInfo.player.userId ? styles.me : ''
                }
                key={index}
              >
                <td>#{lbPlayerInfo.globalRank}</td>
                <td>
                  <Link href={`/players/${lbPlayerInfo.player.osuId}`}>
                    <div className={styles.propic}>
                      <Image
                        src={`https://a.ppy.sh/${lbPlayerInfo.player.osuId}`}
                        alt={`${lbPlayerInfo.player.username}'s Propic`}
                        fill
                      />
                    </div>
                    {lbPlayerInfo.player.username}
                  </Link>
                </td>
                <td>
                  <div className={styles.rank}>
                    <Tooltip
                      id={`tooltip-${lbPlayerInfo.currentTier}`}
                      style={{
                        padding: '0.6em 1.2em',
                        borderRadius: '0.6em',
                        fontWeight: '500',
                        background: 'hsl(0,0%,82%)',
                        color: '#333',
                      }}
                    />
                    <Image
                      src={`/icons/ranks/${lbPlayerInfo.currentTier}.svg`}
                      alt={lbPlayerInfo.currentTier ?? 'Unknown tier'}
                      data-tooltip-id={`tooltip-${lbPlayerInfo.currentTier}`}
                      data-tooltip-content={lbPlayerInfo.currentTier}
                      data-tooltip-delay-show={400}
                      style={
                        lbPlayerInfo.currentTier === 'Elite Grandmaster'
                          ? { transform: 'scale(1.25)' }
                          : lbPlayerInfo.currentTier?.includes('Silver')
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
                <td>{Math.round(lbPlayerInfo.rating)}</td>
                <td>{lbPlayerInfo.matchesPlayed}</td>
                <td>{((lbPlayerInfo.winRate ?? 0) * 100).toFixed(1)}%</td>
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
