import { useEffect, useState } from "react";
import Footer from "../Footer";
import NavBar from "../NavBar";
import LeaderboardTable from "../cards/LeaderboardTable";

function Leaderboards( { mode }: {mode: number}) {
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetch(
      apiUrl +
        "/leaderboards?mode=" +
        mode +
        "&page=" +
        page +
        "&pageSize=" +
        pageSize,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        setData(data);
      })
      .catch((error) => {
        console.error("Error fetching player data:", error);
      });
  }, [apiUrl, mode, page, pageSize]);

  return (
    <>
      <div className="flex m-5 md:m-10 bg-gray-100 rounded-xl">
        <LeaderboardTable leaderboardData={data} page={page} setPage={setPage} />
      </div>
      <Footer />
    </>
  );
}

export default Leaderboards;
