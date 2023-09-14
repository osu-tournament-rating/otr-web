import { IUserRankingCardProps } from "./IUserRankingCardProps";

function UserRankingCard( { rankingClass, rating, globalRank, countryRank, percentile, nextRankingClass, ratingRemainingForNextRank }: IUserRankingCardProps) {
    return(
        <div className="card flex m-2 bg-gray-100 rounded-xl justify-center items-center">
            <div className="flex flex-row">
                <p className="text-4xl font-bold font-sans">{rankingClass}</p>

                <div className="flex flex-col">
                    <p className="text-sm">Rating</p>
                    <p className="text-2xl font-bold">{rating}</p>
                </div>
            </div>
        </div>
    );
}

export default UserRankingCard;