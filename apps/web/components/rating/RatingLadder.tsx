import { tierData } from '@/lib/utils/tierData';

import TierCard from './TierCard';

/**
 * Every tier with the rating that reaches it, as a grid of tiles. It sits
 * straight inside its panel, with no frame of its own.
 */
export default function RatingLadder() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:auto-cols-fr xl:grid-flow-col">
      {tierData.map((item) => (
        <TierCard
          key={item.tier}
          tier={item.tier}
          displayName={item.displayName}
          rating={item.baseRating}
          iconSize={40}
          className="last:col-span-full last:sm:col-auto"
        />
      ))}
    </div>
  );
}
