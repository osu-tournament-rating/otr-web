import FilterButtons from '@/components/FilterButtons/FilterButtons';
import Leaderboard from '@/components/Leaderboard/Leaderboard';
import UserStats from '@/components/Leaderboard/UserStats/UserStats';
import { redirect } from 'next/navigation';
import { fetchLeaderboard } from '../actions';
import styles from './page.module.css';

export const revalidate = 60;

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboards',
};

const catchErrors = async (params: {}, leaderboard: any) => {
  /* const { type, rank, rating, matches, winRate, inclTier, exclTier } = params; */

  if (leaderboard === undefined) {
    return redirect('/leaderboards');
  }

  return;
};

export default async function page(props: {
  searchParams: Promise<URLSearchParams>;
}) {
  const searchParams = await props.searchParams;
  const leaderboardData = await fetchLeaderboard(searchParams);
  await catchErrors(searchParams, leaderboardData);

  return (
    <div className={styles.content}>
      <FilterButtons params={searchParams} data={leaderboardData} />
      <Leaderboard params={searchParams} data={leaderboardData} />
    </div>
  );
}
