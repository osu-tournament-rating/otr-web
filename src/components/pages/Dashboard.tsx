import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserAvatarCard from "../cards/UserAvatarCard";
import NavBar from "../NavBar";
import UserRankingCard from "../cards/UserRankingCard";
import MissingDataNotice from "../notices/MissingDataNotice";
import NoDataNotice from "../notices/NoDataNotice";
import TRUseCaseNotice from "../notices/TRUseCaseNotice";
import UserRatingChart from "../charts/UserRatingChart";
import DateSelector from "../DateSelector";
import Footer from "../Footer";
import UserMatchesMapsCard from "../UserMatchesMapsCard";

function Dashboard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [player, setPlayer] = useState<any>(null);
  const [mode, setMode] = useState(0);
  const [historyDays, setHistoryDays] = useState(90);
  const navigate = useNavigate();
  const apiLink = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetch(
      apiLink + "/players/11536421?offsetDays=" + historyDays + "&mode=" + mode,
      {
        method: "GET",
        credentials: "include",
      }
    )
      .then((response) => response.json())
      .then((data) => {
        setPlayer(data);
        console.log(data);
      })
      .catch((error) => {
        console.error(
          "Error fetching player data, auth key likely expired:",
          error
        );
        return navigate("/unauthorized", { replace: true });
      });
  }, [historyDays]); // The empty dependency array ensures this effect runs only once, similar to componentDidMount

  if (player == null) {
    return <p>Loading...</p>;
  }

  const stats = player["statistics"];
  const averageOpponentRating = stats["averageOpponentRating"];
  const averageTeammateRating = stats["averageTeammateRating"];
  const bestPerformingOpponent = stats["bestPerformingOpponent"];
  const bestPerformingTeammate = stats["bestPerformingTeammate"];
  const bestWinStreak = stats["bestWinStreak"];
  const countryRank = stats["countryRank"];
  const gamesPlayed = stats["gamesPlayed"];
  const gamesWon = stats["gamesWon"];
  const gamesLost = stats["gamesLost"];
  const globalRank = stats["globalRank"];
  const highestGlobalRank = stats["highestGlobalRank"];
  const highestPercentile = stats["highestPercentile"];
  const highestRating = stats["highestRating"];
  const mapAverageAccuracy = stats["mapAverageAccuracy"];
  const mapAverageMisses = stats["mapAverageMisses"];
  const mapAveragePlacing = stats["mapAveragePlacing"];
  const mapAverageScore = stats["mapAverageScore"];
  const matchAverageAccuracy = stats["matchAverageAccuracy"];
  const matchAverageMapsPlayed = stats["matchAverageMapsPlayed"];
  const matchAverageMisses = stats["matchAverageMisses"];
  const matchAverageScore = stats["matchAverageScore"];
  const matchesPlayed = stats["matchesPlayed"];
  const matchesLost = stats["matchesLost"];
  const matchesWon = stats["matchesWon"];
  const mostPlayedOpponent = stats["mostPlayedOpponent"];
  const mostPlayedTeammateName = stats["mostPlayedTeammateName"];
  const nextRanking = stats["nextRanking"];
  const percentile = Math.round(stats["percentile"] * 10) / 10;
  const playedDT = stats["playedDT"];
  const playedHD = stats["playedHD"];
  const playedHR = stats["playedHR"];
  const playedNM = stats["playedNM"];
  const ranking = stats["ranking"];
  const rating = stats["rating"];
  const ratingDelta = stats["ratingDelta"];
  const ratingForNextRank = stats["ratingForNextRank"];
  const worstPerformingOpponent = stats["worstPerformingOpponent"];
  const worstPerformingTeammate = stats["worstPerformingTeammate"];

  // Trends
  const isRatingPositiveTrend = stats["isRatingPositiveTrend"];
  const isGlobalRankPositiveTrend = stats["isGlobalRankPositiveTrend"];
  const isCountryRankPositiveTrend = stats["isCountryRankPositiveTrend"];
  const isPercentilePositiveTrend = stats["isPercentilePositiveTrend"];

  const ratingGainedSincePeriod = stats["ratingGainedSincePeriod"];
  const ratingGainedSincePeriodDisplay =
    ratingGainedSincePeriod > 0
      ? `+${ratingGainedSincePeriod}`
      : ratingGainedSincePeriod;
  const ratingGainedSincePeriodColor =
    ratingGainedSincePeriod > 0 ? "text-green-400" : "text-red-400";

  console.log(historyDays);

  return (
    <>
      <NavBar />
      <TRUseCaseNotice />
      <MissingDataNotice />
      {player["ratings"].length === 0 && <NoDataNotice />}

      {player && (
        <div>
          <div className="md:flex m-5 md:m-10 space-y-5 md:space-y-0 md:space-x-4">
            <UserAvatarCard osuId={player["osuId"]} />
            <UserRankingCard
              rankingClass={ranking}
              rating={rating}
              globalRank={globalRank}
              countryRank={countryRank}
              percentile={percentile}
              nextRankingClass={nextRanking}
              ratingRemainingForNextRank={ratingForNextRank}
              ratingDelta={ratingDelta}
              isRatingPositiveTrend={isRatingPositiveTrend}
              isGlobalRankPositiveTrend={isGlobalRankPositiveTrend}
              isCountryRankPositiveTrend={isCountryRankPositiveTrend}
              isPercentilePositiveTrend={isPercentilePositiveTrend}
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
                className={`font-sans text-2xl md:text-3xl font-bold -mx-3 md:-mx-12 mt-8 md:mt-12 ${ratingGainedSincePeriodColor}`}
              >
                {ratingGainedSincePeriodDisplay}
              </p>

              <div className="hidden sm:flex justify-end w-full mt-auto mb-5 mr-20 text-lg space-x-10">
                <div className="flex space-x-3">
                  <p className="font-sans">Highest rating</p>
                  <p className="font-sans font-bold">{highestRating}</p>
                </div>
                <div className="hidden md:flex space-x-3">
                  <p className="font-sans">Highest rank</p>
                  <p className="font-sans font-bold">#{highestGlobalRank}</p>
                </div>
                <div className="hidden lg:flex space-x-3">
                  <p className="font-sans">Highest percentile</p>
                  <p className="font-sans font-bold">{highestPercentile}%</p>
                </div>
              </div>
            </div>
            <UserRatingChart ratingHistories={player["ratingHistories"]} />
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
        </div>
      )}

      <Footer />
    </>
  );
}

export default Dashboard;
