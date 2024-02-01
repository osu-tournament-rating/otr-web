import { fetchUserPage, fetchUserPageTitle } from '@/app/actions';
import AreaChart from '@/components/Charts/AreaChart/AreaChart';
import BarChart from '@/components/Charts/BarChart/BarChart';
import DoughnutChart from '@/components/Charts/DoughnutChart/DoughnutChart';
import PlayersBarChart from '@/components/Charts/PlayersBarChart/PlayersBarChart';
import RadarChart from '@/components/Charts/RadarChart/RadarChart';
import FilterButtons from '@/components/Dashboard/FilterButtons/FilterButtons';
import GridCard from '@/components/Dashboard/GridCard/GridCard';
import UserTotalMatches from '@/components/Dashboard/Matches/UserTotalMatches/UserTotalMatches';
import StatsGrid from '@/components/Dashboard/StatsGrid/StatsGrid';
import FormattedNumber from '@/components/FormattedNumber/FormattedNumber';
import UserMainCard from '@/components/Profile/UserMainCard/UserMainCard';
import clsx from 'clsx';
import styles from './page.module.css';

export async function generateMetadata({
  params: { id },
}: {
  params: { id: string | number };
}) {
  let player = await fetchUserPageTitle(id);

  return {
    title: player !== null ? `${player?.username}'s profile` : 'User profile',
  };
}

export const revalidate = 60;

export default async function page({
  searchParams,
  params: { id },
}: {
  searchParams: string | string[] | {};
  params: { id: string | number };
}) {
  const data = await fetchUserPage(id);

  return (
    <main className={styles.main}>
      <UserMainCard
        generalStats={data?.generalStats}
        playerInfo={data?.playerInfo}
      />
      <div className={styles.mainGraphContainer}>
        <FilterButtons params={searchParams} />
        <div className={styles.graphContainer}>
          <div className={styles.header}>
            <div className={styles.rating}>
              <span>{Math.round(data.generalStats.rating)}</span>
              <span
                className={clsx(
                  styles.change,
                  data.matchStats.ratingGained >= 0
                    ? styles.positive
                    : styles.negative
                )}
              >
                {data.matchStats.ratingGained.toFixed(0) !== 0 &&
                  data.matchStats.ratingGained.toFixed(0)}
              </span>
            </div>
            <div className={styles.stats}>
              <div className={styles.item}>
                <div className={styles.text}>Highest rating</div>
                <span className={styles.score}>
                  {data.matchStats.highestRating.toFixed(0)}
                </span>
              </div>
              <div className={styles.item}>
                <div className={styles.text}>Highest rank</div>
                <span className={styles.score} id={styles.rank}>
                  <FormattedNumber number={data.matchStats.highestGlobalRank} />
                </span>
              </div>
              <div className={styles.item}>
                <div className={styles.text}>Highest percentile</div>
                <span className={styles.score} id={styles.percentile}>
                  {(data.matchStats.highestPercentile * 100).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.chart}>
            <AreaChart ratingStats={data.ratingStats} />
          </div>
        </div>
      </div>
      <StatsGrid>
        <UserTotalMatches data={data?.matchStats} />
        <GridCard title={'Most played mods'}>
          <DoughnutChart scoreStats={data?.scoreStats} />
        </GridCard>
        <GridCard title={'General'}>
          <div className={styles.cardStat}>
            <span>Average opponent rating</span>
            <span className={styles.value}>
              {data?.matchStats.averageOpponentRating.toFixed(0)}
            </span>
          </div>
          <div className={styles.cardStat}>
            <span>Average teammate rating</span>
            <span className={styles.value}>
              {data?.matchStats.averageTeammateRating.toFixed(0)}
            </span>
          </div>
          <div className={styles.cardStat}>
            <span>Best win streak</span>
            <span className={styles.value}>
              {data?.matchStats.bestWinStreak}
            </span>
          </div>
        </GridCard>
        <GridCard title={'Per match'}>
          <div className={styles.cardStat}>
            <span>Average score</span>
            <span className={styles.value}>
              <FormattedNumber
                number={Math.floor(data?.matchStats.matchAverageScoreAggregate)}
              />
            </span>
          </div>
          <div className={styles.cardStat}>
            <span>Average misses</span>
            <span className={styles.value}>
              {data?.matchStats.matchAverageMissesAggregate.toFixed(0)}
            </span>
          </div>
          <div className={styles.cardStat}>
            <span>Average accuracy</span>
            <span className={styles.value}>
              {data?.matchStats.matchAverageAccuracyAggregate.toFixed(2)}%
            </span>
          </div>
          <div className={styles.cardStat}>
            <span>Average maps played</span>
            <span className={styles.value}>
              {data?.matchStats.averageGamesPlayedAggregate.toFixed(0)}
            </span>
          </div>
        </GridCard>
        <GridCard title={'Winrate by mod'}>
          <RadarChart winrateModData={data?.modStats} />
        </GridCard>
        <GridCard title={'Teammates'}>
          <div className={styles.cardStat}>
            <span>Most played</span>
            <span className={styles.value}>
              {data?.matchStats.mostPlayedTeammateName}
            </span>
          </div>
          <div className={styles.cardStat}>
            <span>Best teammate</span>
            <span className={styles.value}>
              {data?.matchStats.bestTeammateName}
            </span>
          </div>
        </GridCard>
        <GridCard title={'Opponents'}>
          <div className={styles.cardStat}>
            <span>Most played</span>
            <span className={styles.value}>
              {data?.matchStats.mostPlayedOpponentName}
            </span>
          </div>
          <div className={styles.cardStat}>
            <span>Best opponent</span>
            <span className={styles.value}>TO DO</span>
          </div>
        </GridCard>
        <GridCard title={'Average score per mod'}>
          <RadarChart averageModScore={data?.modStats} />
        </GridCard>
        <GridCard title={'Most played with teammates'}>
          <PlayersBarChart players={data?.frequentTeammates} />
        </GridCard>
        <GridCard title={'Most played with opponents'}>
          <PlayersBarChart players={data?.frequentOpponents} />
        </GridCard>
      </StatsGrid>
      <StatsGrid>
        <GridCard title={'Most common format'}>
          <BarChart
            mainAxe={'x'}
            teamSizes={data?.tournamentStats.teamSizeCounts}
          />
        </GridCard>
        <GridCard title={'Best tournament performances'}>
          <BarChart
            mainAxe={'y'}
            bestTournamentPerformances={data?.tournamentStats.bestPerformances}
          />
        </GridCard>
        <GridCard title={'Worst tournament performances'}>
          {data?.tournamentStats.worstPerformances.length > 0 ? (
            <BarChart
              mainAxe={'y'}
              worstTournamentPerformances={
                data?.tournamentStats.worstPerformances
              }
            />
          ) : (
            <span className={styles.noGraphText}>
              Play 6 or more tournaments to populate this graph!
            </span>
          )}
        </GridCard>
      </StatsGrid>
    </main>
  );
}
