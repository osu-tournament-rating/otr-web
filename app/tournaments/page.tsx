import TournamentCard from "@/components/tournaments/TournamentCard";
import { tournaments } from "@/lib/api"
import { Metadata } from "next";

export default async function Page() {
    const tournamentData = await tournaments.list({
        page: 1,
        pageSize: 25,
        verified: false
    });

    return (
        <>
            {tournamentData.result.map((t) => {
                <TournamentCard tournament={t} />
            })}
        </>
    )
}