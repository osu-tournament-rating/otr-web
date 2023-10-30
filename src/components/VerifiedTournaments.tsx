import { useEffect, useState } from "react";

export interface IVerifiedTournamentProps {
    hasVerifierRole: boolean;
}

function VerifiedTournaments({ hasVerifierRole }: IVerifiedTournamentProps) {
    const [verifiedTournaments, setVerifiedTournaments] = useState([]);

    useEffect(() => {
        if (!hasVerifierRole) {
            return;
        }

        const apiUrl = process.env.REACT_APP_API_URL;
        const origin = process.env.REACT_APP_ORIGIN_URL;

        fetch(apiUrl + "/tournaments", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": `${origin}`
            }
        })
            .then((response) => response.json())
            .then((data) => {
                setVerifiedTournaments(data);
            })
            .catch((error) => {
                console.error("Error fetching verified tournaments:", error);
            })
    }, [hasVerifierRole])

    return (
        <div>
            <div className="table-wrp block m-10 bg-gray-100 p-5 rounded-xl max-h-96 overflow-scroll">
                <div className="w-4/5 border-b-2 m-auto">
                    <div className="table-header-group">
                        <div className="table-row">
                            <div className="table-cell text-3xl font-bold font-sans">Tournament</div>
                            <div className="table-cell text-3xl font-bold font-sans">Abbrev</div>
                            <div className="table-cell text-3xl font-bold font-sans">Rank</div>
                            <div className="table-cell text-3xl font-bold font-sans">Mode</div>
                            <div className="table-cell text-3xl font-bold font-sans">Team</div>
                        </div>

                    </div>
                    <div className="table-row-group overflow-y-scroll h-96">
                        {
                            verifiedTournaments.map((tournament: any) => {
                                return (
                                    <div className="table-row" key={tournament.tournamentName}>
                                        <div className="table-cell font-sans text-md font-semibold"><a href={tournament.forumUrl} target="#">{tournament.name}</a></div>
                                        <div className="table-cell font-sans text-md">{tournament.abbreviation}</div>
                                        <div className="table-cell font-sans text-md">{tournament.rankRangeLowerBound}</div>
                                        <div className="table-cell font-sans text-md">{tournament.mode}</div>
                                        <div className="table-cell font-sans text-md">{tournament.teamSize}</div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            </div>
        </div>
    )

}

export default VerifiedTournaments;