import Footer from "../Footer";
import NavBar from "../NavBar";
import LeaderboardTable from "../cards/LeaderboardTable";

function Leaderboards() {
    const dummyData = [
        {
            "rank": 1,
            "username": "chocomint",
            "tier": "Elite Grandmaster",
            "rating": 3105,
            "Matches": 432,
            "Winrate": 0.6627
        },
        {
            "rank": 2,
            "username": "chocomint",
            "tier": "Elite Grandmaster",
            "rating": 3105,
            "Matches": 432,
            "Winrate": 0.6627
        },
        {
            "rank": 3,
            "username": "chocomint",
            "tier": "Elite Grandmaster",
            "rating": 3105,
            "Matches": 432,
            "Winrate": 0.6627
        },
    ]

    return (
        <>
            <NavBar />
                <div className="flex m-5 md:m-10 bg-gray-100 rounded-xl">
                    <LeaderboardTable leaderboardData={dummyData} />
                </div>
            <Footer />
        </>
    )
}

export default Leaderboards;