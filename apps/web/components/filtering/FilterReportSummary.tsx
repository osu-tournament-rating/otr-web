import { CheckCircle2, ClipboardCheck, Users, XCircle } from 'lucide-react';

import { Timestamp } from '@/components/kit/format/Timestamp';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';
import { MissingValue } from '@/components/kit/tables/MissingValue';
import { formatCount, formatId, formatRating } from '@/lib/kit/format/number';
import { getRulesetLabel } from '@/lib/kit/format/ruleset';
import type {
  FilteringResult,
  StoredFilteringRequest,
} from '@/lib/orpc/schema/filtering';

/**
 * A filter report at a glance: its ID and time in the header strip, then
 * the passed, failed and total counts, and the criteria it was run with.
 */
export default function FilterReportSummary({
  reportId,
  created,
  results,
  request,
}: {
  reportId: number;
  created: string;
  results: FilteringResult;
  /** The criteria, when they are known (a stored report). */
  request?: Pick<StoredFilteringRequest, 'ruleset' | 'minRating' | 'maxRating'>;
}) {
  const rating = (value: number | null | undefined) =>
    value == null ? <MissingValue label="Not set" /> : formatRating(value);

  return (
    <Panel data-testid="filter-report-summary">
      <SectionHeader
        icon={ClipboardCheck}
        title={`Filter report #${formatId(reportId)}`}
        meta={<Timestamp date={created} />}
      />
      <PanelBody>
        <StatTileGrid columns={3}>
          <StatTile
            icon={CheckCircle2}
            label="Passed"
            value={formatCount(results.playersPassed)}
          />
          <StatTile
            icon={XCircle}
            label="Failed"
            value={formatCount(results.playersFailed)}
          />
          <StatTile
            icon={Users}
            label="Total players"
            value={formatCount(results.filteringResults.length)}
          />
          {request ? (
            <>
              <StatTile
                label="Ruleset"
                value={getRulesetLabel(request.ruleset)}
              />
              <StatTile
                label="Minimum rating"
                value={rating(request.minRating)}
              />
              <StatTile
                label="Maximum rating"
                value={rating(request.maxRating)}
              />
            </>
          ) : null}
        </StatTileGrid>
      </PanelBody>
    </Panel>
  );
}
