import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

interface ILeaderboardTableProps {
  leaderboardData: any[];
  page: number;
  setPage: (page: number) => void;
}

function LeaderboardTable({
  leaderboardData,
  page,
  setPage,
}: ILeaderboardTableProps) {
  console.log(leaderboardData);
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
          <div className="flex-1 -ml-10 mr-5">
            <div className="flex space-x-2">
              <img
                src={`https://a.ppy.sh/${item.osuId}`}
                className="flex rounded-full w-6"
                alt="avatar"
              />
              <p className="flex">{item.name}</p>
            </div>
          </div>
          <div className="flex-1">{item.tier}</div>
          <div className="flex-1">{item.rating}</div>
          <div className="flex-1">{item.matchesPlayed}</div>
          <div className="flex-1">{(item.winRate * 100).toFixed(1)}%</div>
        </div>
      ))}
      <div className="flex justify-center space-x-3 mt-4">
        <button
          onClick={() => setPage(Math.max(page - 1, 0))}
          className={`focus:outline-none focus:border-none cursor-pointer flex flex-row ${
            page === 0 ? "text-gray-400" : ""
          }`}
          style={{ userSelect: "none", border: "none", background: "none" }}
          disabled={page === 0}
        >
          <KeyboardArrowLeftIcon fontSize="small" className="my-auto" />
          <p>Previous</p>
        </button>

        {[...Array(5)].map((_, i) => {
          let pageNumber = page + i - 1;
          if (page < 2) pageNumber = i;
          if (page > 97) pageNumber = 95 + i;

          return (
            <button
              key={i}
              onClick={() => setPage(pageNumber)}
              className={`focus:outline-none focus:border-none cursor-pointer flex flex-row ${
                page === pageNumber ? "text-blue-500 font-bold" : ""
              }`}
              style={{ userSelect: "none", border: "none", background: "none" }}
            >
              <p>{pageNumber + 1}</p>
            </button>
          );
        })}

        {page + 1 < 98 && (
          <>
            <div className="flex flex-row">
              <p>...</p>
            </div>
            <button
              onClick={() => setPage(99)}
              className="focus:outline-none focus:border-none cursor-pointer flex flex-row"
              style={{ userSelect: "none", border: "none", background: "none" }}
            >
              <p>100</p>
            </button>
          </>
        )}

        <button
          onClick={() => setPage(Math.min(page + 1, 99))}
          className={`focus:outline-none focus:border-none cursor-pointer flex flex-row ${
            page === 99 ? "text-gray-400" : ""
          }`}
          style={{ userSelect: "none", border: "none", background: "none" }}
          disabled={page === 99}
        >
          <p>Next</p>
          <KeyboardArrowRightIcon fontSize="small" className="my-auto" />
        </button>
      </div>
    </div>
  );
}

export default LeaderboardTable;
