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
        {leaderboardData.map((item, index) => (
          <div className="flex mb-4 bg-gray-200 rounded-xl p-4 -mx-5" key={index}>
            <div className="flex-1 ml-5">#{item.globalRank}</div>
            <div className="flex-1 -ml-5">{item.name}</div>
            <div className="flex-1">{item.tier}</div>
            <div className="flex-1">{item.rating}</div>
            <div className="flex-1">{item.matchesPlayed}</div>
            <div className="flex-1">{(item.winRate * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    );
  }
  

export default LeaderboardTable;