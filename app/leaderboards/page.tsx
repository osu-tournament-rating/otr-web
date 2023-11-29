import FilterButtons from '@/components/FilterButtons/FilterButtons';
import Leaderboard from '@/components/Leaderboard/Leaderboard';
import UserStats from '@/components/Leaderboard/UserStats/UserStats';
import { redirect } from 'next/navigation';
import { fetchLeaderboard } from '../actions';
import styles from './page.module.css';

export const revalidate = 60;

/* const catchErrors = async (params: {}) => {
  const { type, rank, rating, matches, winrate, inclTier, exclTier } = params;

  let leaderboardTypes = ['global', 'country', 'friends'];

  if (!type || (type?.length > 0 && leaderboardTypes.includes(type))) return;

  return redirect('/leaderboards');
}; */

export default async function page({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  /* await catchErrors(searchParams); */
  const leaderboardData = await fetchLeaderboard(searchParams);

  return (
    <main className={styles.container}>
      {leaderboardData.playerChart && (
        <UserStats data={leaderboardData.playerChart} />
      )}
      <div className={styles.content}>
        <FilterButtons params={searchParams} data={leaderboardData} />
        <Leaderboard params={searchParams} data={leaderboardData} />
      </div>
    </main>
  );
}
