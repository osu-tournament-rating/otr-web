interface ILeaderboardTableProps {
    leaderboardData: any[];
}

function LeaderboardTable({ leaderboardData }: ILeaderboardTableProps) {
    return (
        <div className="bg-gray-100 table w-full rounded-xl m-10 font-sans">
            <div className="table-header-group">
                <div className="table-row">
                    <div className="table-cell font-bold">Rank</div>
                    <div className="table-cell font-bold">Player</div>
                    <div className="table-cell font-bold">Tier</div>
                    <div className="table-cell font-bold">Rating</div>
                    <div className="table-cell font-bold">Matches</div>
                    <div className="table-cell font-bold">Winrate</div>
                </div>
            </div>
            <div className="table-row-group font-sans">
                {leaderboardData.map((player, index) => {
                    return (
                        <div className="table-row bg-gray-200 rounded-xl my-2" key={index}>
                            <div className="table-cell">#{player.rank}</div>
                            <div className="table-cell">{player.username}</div>
                            <div className="table-cell">{player.tier}</div>
                            <div className="table-cell">{player.rating}</div>
                            <div className="table-cell">{player.Matches}</div>
                            <div className="table-cell">{(player.Winrate * 100).toFixed(2)}%</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default LeaderboardTable;