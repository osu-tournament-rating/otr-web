interface ILeaderboardTableProps {
    leaderboardData: any[];
}

function LeaderboardTable({ leaderboardData }: ILeaderboardTableProps) {
    return (
      <div className="bg-gray-100 w-full rounded-xl m-10 font-sans p-4">
        <div className="flex mb-4 px-2 rounded-md">
          <div className="flex-1 font-bold">Rank</div>
          <div className="flex-1 font-bold">Player</div>
          <div className="flex-1 font-bold">Tier</div>
          <div className="flex-1 font-bold">Rating</div>
          <div className="flex-1 font-bold">Matches</div>
          <div className="flex-1 font-bold">Winrate</div>
        </div>
        {leaderboardData.map((player, index) => (
          <div className="flex mb-4 bg-gray-200 rounded-xl p-4 -mx-5" key={index}>
            <div className="flex-1 ml-5">#{player.rank}</div>
            <div className="flex-1 -ml-5">{player.username}</div>
            <div className="flex-1">{player.tier}</div>
            <div className="flex-1">{player.rating}</div>
            <div className="flex-1">{player.Matches}</div>
            <div className="flex-1">{(player.Winrate * 100).toFixed(2)}%</div>
          </div>
        ))}
      </div>
    );
  }
  

export default LeaderboardTable;