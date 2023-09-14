import { IUserRankingCardProps } from "./IUserRankingCardProps";

/* Function that takes in a string number and outputs comma-separated digits */
function formatNumberWithCommas(num: string) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function UserRankingCard({
  rankingClass,
  rating,
  globalRank,
  countryRank,
  percentile,
  nextRankingClass,
  ratingRemainingForNextRank,
}: IUserRankingCardProps) {
  return (
    <>
      <div className="card flex flex-col bg-gray-100 rounded-lg w-full">
        <div className="flex-col">
          <div className="flex flex-row m-6">
            <p className="text-6xl font-semibold font-sans">{rankingClass}</p>

            <div className="flex flex-col mx-6">
              <p className="text-lg font-sans">Rating</p>
              <p className="text-lg font-bold font-sans">{rating}</p>
            </div>
            <div className="flex flex-col mx-6">
              <p className="text-lg font-sans">Global</p>
              <p className="text-lg font-bold font-sans">
                #{formatNumberWithCommas(globalRank)}
              </p>
            </div>
            <div className="flex flex-col mx-6">
              <p className="text-lg font-sans">Country</p>
              <p className="text-lg font-bold font-sans">
                #{formatNumberWithCommas(countryRank)}
              </p>
            </div>
            <div className="flex flex-col mx-6">
              <p className="text-lg font-sans">Percentile</p>
              <p className="text-lg font-bold font-sans">{percentile}</p>
            </div>
          </div>
        </div>
        <div className="flex-col m-6">
            <div className="flex-col">
                <p className="text-2xl font-semibold font-sans">{formatNumberWithCommas(ratingRemainingForNextRank)} TR left until {nextRankingClass}</p>
            </div>
            <div className="flex-col">
                <div className="w-1/2 bg-gray-200 rounded-full dark:bg-gray-700">
                    <div className="bg-blue-300 pt-3 leading-none rounded-full w-1/4"></div>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}

export default UserRankingCard;
