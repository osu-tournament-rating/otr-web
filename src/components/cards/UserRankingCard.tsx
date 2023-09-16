import { IUserRankingCardProps } from "./IUserRankingCardProps";

/* Function that takes in a string number and outputs comma-separated digits */
function formatNumberWithCommas(num: number) {
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
  ratingDelta,
}: IUserRankingCardProps) {
  const barWidthFraction = ratingRemainingForNextRank / ratingDelta;
  console.log(barWidthFraction);

  if (!isNaN(barWidthFraction)) {
    // Round to nearest 1/12 and convert to X/12 string
    if (barWidthFraction > 0 && barWidthFraction <= 1) {
    }
  }

  return (
    <>
      <div className="card w-full flex flex-col bg-gray-100 rounded-lg">
        <div className="xs:flex-col lg:flex-row">
          <div className="flex xs:flex-col lg:flex-row m-6">
            <div className="flex">
              <p className="text-6xl font-semibold font-sans">{rankingClass}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-col mx-6">
              <p className="text-lg font-sans">Rating</p>
              <p className="text-lg font-semibold font-sans">{rating}</p>
            </div>
            <div className="flex flex-col mx-6">
              <p className="text-lg font-sans">Global</p>
              <p className="text-lg font-semibold font-sans">
                #{formatNumberWithCommas(globalRank)}
              </p>
            </div>
            <div className="flex flex-col mx-6">
              <p className="text-lg font-sans">Country</p>
              <p className="text-lg font-semibold font-sans">
                #{formatNumberWithCommas(countryRank)}
              </p>
            </div>
            <div className="flex flex-col mx-6">
              <p className="text-lg font-sans">Percentile</p>
              <p className="text-lg font-semibold font-sans">{percentile}</p>
            </div>
          </div>
        </div>
        <div className="flex-col m-6">
          <div className="flex-col">
            <p className="text-2xl font-semibold font-sans">
              {formatNumberWithCommas(ratingRemainingForNextRank)} TR left until{" "}
              {nextRankingClass}
            </p>
          </div>
          <div className="flex-shrink-0 flex-none pt-3">
            <div className="w-1/2 max-w-md min-w-sm bg-gray-200 rounded-full dark:bg-gray-700">
              <div className="bg-blue-300 pt-3 leading-none rounded-full w-1/12" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserRankingCard;
