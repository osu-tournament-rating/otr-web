import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

interface ILeaderboardTableProps {
  leaderboardData: any[];
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
}

function LeaderboardTable({
  leaderboardData,
  page,
  setPage,
  isLoading,
}: ILeaderboardTableProps) {
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
                className="flex rounded-full w-6 h-6 my-auto"
                alt="avatar"
              />
              <p className="flex">{item.name}</p>
            </div>
          </div>
          <div className="flex-1">{item.tier}</div>
          <div className="flex-1">{item.rating.toFixed(0)}</div>
          <div className="flex-1">{item.matchesPlayed}</div>
          <div className="flex-1">{(item.winRate * 100).toFixed(1)}%</div>
        </div>
      ))}
      <div className="flex justify-center space-x-3 mt-4">
        <button
          onClick={() => !isLoading && setPage(Math.max(page - 1, 0))}
          className={`focus:outline-none focus:border-none cursor-pointer flex flex-row ${page === 0 || isLoading ? "text-gray-400" : ""
            }`}
          style={{
            userSelect: "none",
            border: "none",
            background: "none",
            opacity: isLoading ? 0.5 : 1,
          }}
          disabled={page === 0 || isLoading}
        >
          <KeyboardArrowLeftIcon fontSize="small" className="my-auto" />
          <p>Previous</p>
        </button>

        {page > 3 && (
          <>
            <button
              onClick={() => !isLoading && setPage(0)}
              className={`focus:outline-none focus:border-none cursor-pointer flex flex-row ${isLoading ? "text-gray-400" : ""
                }`}
              style={{
                userSelect: "none",
                border: "none",
                background: "none",
                opacity: isLoading ? 0.5 : 1,
              }}
              disabled={isLoading}
            >
              <p>1</p>
            </button>
            <div className="flex flex-row">
              <p className={`${isLoading ? "text-gray-400" : ""}`}>...</p>
            </div>
          </>
        )}

        {[...Array(5)].map((_, i) => {
          let pageNumber = 0;
          if (page < 3) {
            // First five pages
            pageNumber = i;
          } else if (page > 96) {
            // Last five pages
            pageNumber = 95 + i;
          } else {
            // Middle pages, selected page in center
            pageNumber = page - 2 + i;
          }

          return (
            <button
              key={i}
              onClick={() => !isLoading && setPage(pageNumber)}
              className={`focus:outline-none focus:border-none cursor-pointer flex flex-row ${page === pageNumber ? "text-blue-500 font-bold" : ""
                }`}
              style={{
                userSelect: "none",
                border: "none",
                background: "none",
                opacity: isLoading ? 0.5 : 1,
              }}
              disabled={isLoading}
            >
              <p>{pageNumber + 1}</p>
            </button>
          );
        })}

        {page + 1 < 98 && (
          <>
            <div className="flex flex-row">
              <p className={`${isLoading ? "text-gray-400" : ""}`}>...</p>
            </div>
            <button
              onClick={() => !isLoading && setPage(99)}
              className={`focus:outline-none focus:border-none cursor-pointer flex flex-row ${isLoading ? "text-gray-400" : ""
                }`}
              style={{
                userSelect: "none",
                border: "none",
                background: "none",
                opacity: isLoading ? 0.5 : 1,
              }}
              disabled={isLoading}
            >
              <p>100</p>
            </button>
          </>
        )}

        <button
          onClick={() => !isLoading && setPage(Math.min(page + 1, 99))}
          className={`focus:outline-none focus:border-none cursor-pointer flex flex-row ${page === 99 || isLoading ? "text-gray-400" : ""
            }`}
          style={{
            userSelect: "none",
            border: "none",
            background: "none",
            opacity: isLoading ? 0.5 : 1,
          }}
          disabled={page === 99 || isLoading}
        >
          <p>Next</p>
          <KeyboardArrowRightIcon fontSize="small" className="my-auto" />
        </button>
      </div>
    </div>
  );
}

export default LeaderboardTable;
