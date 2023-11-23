'use client';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
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
                /* className={player.globalRank === 7 ? styles.me : ''} */ // DO CHECK IF AUTH USER IS PLAYER ID
                key={index}
              >
                <td>#{player.globalRank}</td>
                <td>
                  <div className={styles.propic}>
                    <Image
                      src={`http://a.ppy.sh/${player.osuId}`}
                      alt={`${player.name}'s Propic`}
                      fill
                    />
                  </div>
                  {player.name}
                </td>
                <td>
                  <div className={styles.rank}>{player.tier}</div>
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
