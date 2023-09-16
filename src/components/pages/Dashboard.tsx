import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserAvatarCard from "../cards/UserAvatarCard";
import NavBar from "../NavBar";
import UserRankingCard from "../cards/UserRankingCard";
import MissingDataNotice from "../notices/MissingDataNotice";
import NoDataNotice from "../notices/NoDataNotice";
import TRUseCaseNotice from "../notices/TRUseCaseNotice";
import UserRatingChart from "../charts/UserRatingChart";

function Dashboard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [player, setPlayer] = useState<any>(null);
  const [mode, setMode] = useState(0);
  const [historyDays, setHistoryDays] = useState(30);
  const navigate = useNavigate();
  const apiLink = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetch(apiLink + "/me", {
      method: "GET",
      credentials: "include",
    })
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
  }, []); // The empty dependency array ensures this effect runs only once, similar to componentDidMount

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

  return (
    <>
      <NavBar />
      <TRUseCaseNotice />
      <MissingDataNotice />
      {player["ratings"].length === 0 && <NoDataNotice />}

      {player && (
        <div>
          <div className="md:flex m-5 md:m-10 space-y-5 md:space-x-4">
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
            />
          </div>
          <div className="flex m-10 justify-center justify-items-center w-256 h-64">
            <UserRatingChart ratingHistories={player['ratingHistories']} currentRanking={ranking} nextRanking={nextRanking} />
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
