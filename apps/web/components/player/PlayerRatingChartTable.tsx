import { DateText } from '@/components/kit/format/DateText';
import { RatingDelta } from '@/components/kit/format/RatingDelta';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/kit/tables/DataTable';
import { EntityLink } from '@/components/kit/tables/EntityLink';
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';
import { formatDate } from '@/lib/kit/format/date';
import { RATING_ADJUSTMENT_TYPE_LABELS } from '@/lib/kit/format/enum-labels';
import { formatNumber, formatRating } from '@/lib/kit/format/number';
import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';
import { sortData } from '@/lib/utils/playerRatingChart';

import type { RatingMetric } from './rating-adjustment';

function formatMetric(metric: RatingMetric, value: number): string {
  return metric === 'rating'
    ? formatRating(value)
    : formatNumber(value, { decimals: 2 });
}

/**
 * The rating history as a table, newest first, inside a scrolling box with
 * its header pinned. On phones it becomes rows that keep the value and the
 * change in view.
 */
export default function PlayerRatingChartTable({
  data,
  metric,
}: {
  data: PlayerRatingAdjustment[];
  metric: RatingMetric;
}) {
  const rows = sortData(data, true);
  const metricLabel = metric === 'rating' ? 'Rating' : 'Volatility';
  const lowerIsBetter = metric === 'volatility';
  const valueOf = (point: PlayerRatingAdjustment) =>
    metric === 'rating' ? point.ratingAfter : point.volatilityAfter;
  const deltaOf = (point: PlayerRatingAdjustment) =>
    metric === 'rating' ? point.ratingDelta : point.volatilityDelta;

  return (
    // Focusable, so the box scrolls by keyboard.
    <div
      role="region"
      tabIndex={0}
      aria-label={`${metricLabel} history`}
      className="max-h-80 overflow-y-auto border-t outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      <DataTable
        stickyHeader="scroll-area"
        fixed
        aria-label={`${metricLabel} history`}
        phoneRows={
          <PhoneRowList aria-label={`${metricLabel} history`}>
            {rows.map((point, index) => (
              <PhoneRow
                key={`${point.timestamp}-${index}`}
                title={
                  point.match ? (
                    <EntityLink href={`/matches/${point.match.id}`}>
                      {point.match.name}
                    </EntityLink>
                  ) : (
                    RATING_ADJUSTMENT_TYPE_LABELS[point.adjustmentType]
                  )
                }
                // Without a match the title already names the type.
                description={
                  point.match
                    ? `${formatDate(point.timestamp)} · ${RATING_ADJUSTMENT_TYPE_LABELS[point.adjustmentType]}`
                    : formatDate(point.timestamp)
                }
                value={formatMetric(metric, valueOf(point))}
                valueDescription={
                  <RatingDelta
                    value={deltaOf(point)}
                    lowerIsBetter={lowerIsBetter}
                  />
                }
              />
            ))}
          </PhoneRowList>
        }
      >
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead className="w-32">Date</DataTableHead>
            <DataTableHead className="w-36">Type</DataTableHead>
            <DataTableHead numeric className="w-24">
              {metricLabel}
            </DataTableHead>
            <DataTableHead numeric className="w-24">
              Change
            </DataTableHead>
            <DataTableHead>Match</DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((point, index) => (
            <DataTableRow key={`${point.timestamp}-${index}`}>
              <DataTableCell muted>
                <DateText date={point.timestamp} />
              </DataTableCell>
              <DataTableCell>
                {RATING_ADJUSTMENT_TYPE_LABELS[point.adjustmentType]}
              </DataTableCell>
              <DataTableCell numeric className="font-medium">
                {formatMetric(metric, valueOf(point))}
              </DataTableCell>
              <DataTableCell numeric>
                <RatingDelta
                  value={deltaOf(point)}
                  lowerIsBetter={lowerIsBetter}
                />
              </DataTableCell>
              <DataTableCell>
                {point.match ? (
                  <EntityLink
                    href={`/matches/${point.match.id}`}
                    title={point.match.name}
                  >
                    {point.match.name}
                  </EntityLink>
                ) : null}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
