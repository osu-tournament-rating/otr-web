import { RatingAdjustmentDTO } from '@osu-tournament-rating/otr-api-client';
import TRText from '../rating/TRText';
import { format } from 'date-fns';
import { RatingAdjustmentTypeEnumhelper } from '@/lib/enums';

export function formattedDate(date: Date | string) {
  return format(new Date(date), 'MMM d, yyyy');
}

interface PlayerRatingChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RatingAdjustmentDTO }>;
  activeTab: string;
}

export default function PlayerRatingChartTooltip({
  active,
  payload,
  activeTab,
}: PlayerRatingChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isRatingTab = activeTab.toLowerCase() === 'rating';

  // Get the appropriate values based on active tab
  const value = isRatingTab
    ? data.ratingAfter.toFixed(0)
    : data.volatilityAfter.toFixed(2);
  const delta = isRatingTab ? data.ratingDelta : data.volatilityDelta;
  const label = isRatingTab ? 'Rating' : 'Volatility';

  // For volatility, a decrease is good (green), for rating, an increase is good (green)
  const isPositiveChange = isRatingTab ? delta > 0 : delta < 0;
  const isNegativeChange = isRatingTab ? delta < 0 : delta > 0;

  const deltaClassName = `font-medium ${
    isPositiveChange ? 'text-green-500' : isNegativeChange ? 'text-red-500' : ''
  }`;

  return (
    <div className="rounded-md border bg-background p-3 font-sans shadow-md">
      <p className="mb-1 font-medium">{formattedDate(data.timestamp)}</p>
      <p className="text-sm text-muted-foreground">
        Type:{' '}
        {RatingAdjustmentTypeEnumhelper.getMetadata(data.adjustmentType).text}
      </p>
      <p className="text-sm">
        {label}:{' '}
        <span className="inline-flex items-baseline gap-1 font-medium">
          {value}
          {isRatingTab && <TRText />}
        </span>
      </p>
      <p className="text-sm">
        Change:{' '}
        <span className={`inline-flex items-baseline gap-1 ${deltaClassName}`}>
          {delta > 0 ? '+' : ''}
          {delta.toFixed(2)}
          {isRatingTab && <TRText />}
        </span>
      </p>
      {data.match?.name && (
        <p className="text-sm">
          <span>Match: </span>
          <span className="mt-1 text-muted-foreground">{data.match.name}</span>
        </p>
      )}
    </div>
  );
}
