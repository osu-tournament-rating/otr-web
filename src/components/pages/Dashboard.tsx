import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserAvatarCard from "../cards/UserAvatarCard";
import UserRankingCard from "../cards/UserRankingCard";
import MissingDataNotice from "../notices/MissingDataNotice";
import NoDataNotice from "../notices/NoDataNotice";
import TRUseCaseNotice from "../notices/TRUseCaseNotice";
import UserRatingChart from "../charts/UserRatingChart";
import DateSelector from "../DateSelector";
import Footer from "../Footer";
import UserMatchesMapsCard from "../UserMatchesMapsCard";
import DashboardStatsCard from "../cards/DashboardStatsCard";
import { formatNumberWithCommas } from "../../Helpers";
import MostPlayedModsCard from "../cards/MostPlayedModsCard";

function Dashboard({ isAuthenticated, mode }: { isAuthenticated: boolean, mode: number }) {
  const [stats, setStats] = useState<any>(null);
  const [historyDays, setHistoryDays] = useState(90);
  const navigate = useNavigate();

  useEffect(() => {
    // Translate history days to datetime
    const date = new Date();
    date.setDate(date.getDate() - historyDays);
    const formattedDate = date.toISOString().split("T")[0];

    const apiLink = process.env.REACT_APP_API_URL;
    const origin = process.env.REACT_APP_ORIGIN_URL;
    fetch(apiLink + "/me/stats?dateMin=" + formattedDate + "&mode=" + mode, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": `${origin}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setStats(data);
      })
      .catch((error) => {
        console.error(
          "Error fetching player data, auth key likely expired:",
          error
        );

        // Should return /error instead once we have an error page
        return navigate("/unauthorized", { replace: true });
      });
  }, [historyDays, navigate, mode]);

  if (!stats) {
    return <p>Error loading dashboard.</p>;
  }

  const generalStats = stats["generalStats"];
  const matchStats = stats["matchStats"];
  const scoreStats = stats["scoreStats"];
  const tournamentStats = stats["tournamentStats"];
  const ratingStats = stats["ratingStats"];

  const rating = generalStats["rating"].toFixed(0);
  const volatility = generalStats["volatility"].toFixed(3);
  const percentile = (generalStats["percentile"] * 100).toFixed(3);
  const matchesPlayedAllTime = generalStats["matchesPlayed"];
  const winRate = generalStats["winRate"];
  const highestGlobalRankAllTime = generalStats["highestGlobalRank"];
  const globalRank = generalStats["globalRank"];
  const countryRank = generalStats["countryRank"];
  const tier = generalStats["tier"];
  const nextTier = generalStats["nextTier"];
  const ratingForNextTier = generalStats["ratingForNextTier"];
  const ratingDelta = generalStats["ratingDelta"];

  const highestRating = matchStats["highestRating"].toFixed(0);
  const highestGlobalRank = matchStats["highestGlobalRank"];
  const highestCountryRank = matchStats["highestCountryRank"];
  const highestPercentile = matchStats["highestPercentile"];
  const ratingGained = matchStats["ratingGained"].toFixed(0);
  const gamesWon = matchStats["gamesWon"];
  const gamesLost = matchStats["gamesLost"];
  const gamesPlayed = matchStats["gamesPlayed"];
  const matchesWon = matchStats["matchesWon"];
  const matchesLost = matchStats["matchesLost"];
  const matchesPlayed = matchStats["matchesPlayed"];
  const gameWinRate = matchStats["gameWinRate"];
  const matchWinRate = matchStats["matchWinRate"];
  const averageTeammateRating = matchStats["averageTeammateRating"]?.toFixed(0);
  const averageOpponentRating = matchStats["averageOpponentRating"]?.toFixed(0);
  const bestWinStreak = matchStats["bestWinStreak"];
  const averageScore = matchStats["matchAverageScoreAggregate"].toFixed(0);
  const averageMisses = matchStats["matchAverageMissesAggregate"].toFixed(1);
  const averageAccuracy = matchStats["matchAverageAccuracyAggregate"].toFixed(1);
  const averageGamesPlayed = matchStats["averageGamesPlayedAggregate"].toFixed(1);
  const averagePlacing = matchStats["averagePlacingAggregate"].toFixed(1);
  const mostPlayedTeammateName = matchStats["mostPlayedTeammateName"];
  const mostPlayedOpponentName = matchStats["mostPlayedOpponentName"];
  const periodStart = matchStats["periodStart"];
  const periodEnd = matchStats["periodEnd"];

  const averageScoreEZ = scoreStats["averageScoreEZ"];
  const averageScoreHD = scoreStats["averageScoreHD"];
  const averageScoreHR = scoreStats["averageScoreHR"];
  const averageScoreDT = scoreStats["averageScoreDT"];
  const averageScoreFL = scoreStats["averageScoreFL"];
  const averageScoreHDDT = scoreStats["averageScoreHDDT"];
  const averageScoreHDHR = scoreStats["averageScoreHDHR"];
  const averageScoreNM = scoreStats["averageScoreNM"];

  const countPlayedEZ = scoreStats["countPlayedEZ"];
  const countPlayedHD = scoreStats["countPlayedHD"];
  const countPlayedHR = scoreStats["countPlayedHR"];
  const countPlayedDT = scoreStats["countPlayedDT"];
  const countPlayedFL = scoreStats["countPlayedFL"];
  const countPlayedHDDT = scoreStats["countPlayedHDDT"];
  const countPlayedHDHR = scoreStats["countPlayedHDHR"];
  const countPlayedNM = scoreStats["countPlayedNM"];

  const countPlayedTournament1v1 = tournamentStats["count1v1"];
  const countPlayedTournament2v2 = tournamentStats["count2v2"];
  const countPlayedTournament3v3 = tournamentStats["count3v3"];
  const countPlayedTournament4v4 = tournamentStats["count4v4"];
  const countPlayedTournamentOther = tournamentStats["countOther"];
  const topTournamentPerformances = tournamentStats["topPerformances"];

  // Trends
  const isRatingPositiveTrend = ratingGained >= 0;

  const ratingGainedSincePeriodDisplay =
    ratingGained >= 0
      ? `+${ratingGained}`
      : ratingGained;

  const ratingGainedColor =
    ratingGained >= 0 ? "text-green-400" : "text-red-400";

  return (
    <>
      <TRUseCaseNotice />
      <MissingDataNotice />
      {matchesPlayed == 0 && <>
        <NoDataNotice />
        <div className="flex">
          <DateSelector currentDays={historyDays} setDays={setHistoryDays} />
        </div>
      </>
      }

      {matchesPlayed > 0 && (
        <div>
          <div className="md:flex m-5 md:m-10 space-y-5 md:space-y-0 md:space-x-4">
            <UserAvatarCard osuId={stats["osuId"]} />
            <UserRankingCard
              rankingClass={tier}
              rating={rating}
              globalRank={globalRank}
              countryRank={countryRank}
              percentile={percentile}
              nextRankingClass={nextTier}
              ratingRemainingForNextRank={ratingForNextTier}
              ratingDelta={ratingDelta}
              isRatingPositiveTrend={isRatingPositiveTrend}
            />
          </div>
          <div className="flex">
            <DateSelector currentDays={historyDays} setDays={setHistoryDays} />
          </div>
          <div
            className="m-5 md:m-10 bg-gray-100 rounded-xl pb-28"
            style={{ height: "30rem" }}
          >
            <div className="flex flex-row">
              <p className="font-sans text-4xl md:text-5xl font-bold my-5 md:my-8 mx-4 md:mx-14">
                {rating}
              </p>
              <p
                className={`font-sans text-2xl md:text-3xl font-bold -mx-3 md:-mx-12 mt-8 md:mt-12 ${ratingGainedColor}`}
              >
                {ratingGainedSincePeriodDisplay}
              </p>

              <div className="hidden sm:flex justify-end w-full mt-auto mb-5 mr-20 text-lg space-x-10">
                <div className="flex space-x-3">
                  <p className="font-sans">Highest rating</p>
                  <p className="font-sans font-bold">{highestRating}</p>
                </div>
                {/* <div className="hidden md:flex space-x-3">
                  <p className="font-sans">Highest rank</p>
                  <p className="font-sans font-bold">#{highestGlobalRank}</p>
                </div>
                <div className="hidden lg:flex space-x-3">
                  <p className="font-sans">Highest percentile</p>
                  <p className="font-sans font-bold">{highestPercentile}%</p>
                </div> */}
              </div>
            </div>
            <UserRatingChart ratingData={ratingStats} />
          </div>
          <div>
            <UserMatchesMapsCard
              matches={matchesPlayed}
              maps={gamesPlayed}
              matchesWon={matchesWon}
              matchesLost={matchesLost}
              mapsWon={gamesWon}
              mapsLost={gamesLost}
            />
          </div>
          <div className="flex m-7">
            <DashboardStatsCard
              title="General"
              labels={[
                "Average opponent rating",
                "Average teammate rating",
                "Best win streak",
              ]}
              values={[
                averageOpponentRating,
                averageTeammateRating,
                bestWinStreak,
              ]}
            />
            <DashboardStatsCard
              title="Per match"
              labels={[
                "Average score",
                "Average misses",
                "Average accuracy",
                "Average maps played",
              ]}
              values={[
                formatNumberWithCommas(averageScore),
                formatNumberWithCommas(averageMisses),
                averageAccuracy + "%",
                averageGamesPlayed,
              ]}
            />
            <DashboardStatsCard
              title="Per map"
              labels={[
                "Average score",
                "Average misses",
                "Average accuracy",
                "Average placing",
              ]}
              values={[
                averageOpponentRating,
                averageTeammateRating,
                bestWinStreak,
                averagePlacing,
              ]}
            />
          </div>
          <div className="flex m-7">
            <MostPlayedModsCard
              countHR={countPlayedHR}
              countDT={countPlayedDT}
              countHD={countPlayedHD}
            />

            <DashboardStatsCard
              title="Teammates"
              labels={[
                "Most played",
                "Best teammate",
                "Worst teammate",
              ]}
              values={[
                mostPlayedTeammateName,
                "Foo",
                "Foo",
              ]}
            />
            <DashboardStatsCard
              title="Opponents"
              labels={[
                "Most played",
                "Best opponent",
                "Worst opponent",
              ]}
              values={[
                mostPlayedOpponentName,
                "Foo",
                "Foo",
              ]}
            />
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default Dashboard;
