export interface IUserMatchesMapsCardProps {
    matches: number;
    maps: number;
    matchesWon: number;
    matchesLost: number;
    mapsWon: number;
    mapsLost: number;
}

function UserMatchesMapsCard({ matches, maps, matchesWon, matchesLost, mapsWon, mapsLost }: IUserMatchesMapsCardProps) {
    return (
        <div className="mt-16 flex bg-gray-100 rounded-xl">
            <div className="flex flex-row w-full font-sans m-5">
                <div>
                    <p className="text-4xl font-bold">{matches}</p>
                </div>
                <div>
                </div>
            </div>
        </div>
    )
}

export default UserMatchesMapsCard;