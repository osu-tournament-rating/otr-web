'use client';

import { useState } from 'react';
import { Clock, Filter } from 'lucide-react';

import { Callout } from '@/components/kit/feedback/Callout';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import FilteringForm from '@/components/filtering/FilteringForm';
import type { FilteringResult } from '@/lib/orpc/schema/filtering';

const FILTERING_RULES_URL =
  'https://osu.ppy.sh/wiki/en/Tournaments/Official_support#registrant-filtering-and-seeding';

type FilteringPageClientProps = {
  filterBlocked: boolean;
};

export default function FilteringPageClient({
  filterBlocked,
}: FilteringPageClientProps) {
  const [filteringResults, setFilteringResults] =
    useState<FilteringResult | null>(null);

  return (
    <PageFrame>
      <PageHeader
        icon={Filter}
        title="Tournament registrant filtering"
        description="Filter your tournament registrants based on rating eligibility criteria."
      />
      <Callout
        tone="warning"
        title="Host compliance"
        data-testid="filtering-compliance"
      >
        <p>
          Hosts must comply with the{' '}
          <a href={FILTERING_RULES_URL}>
            official tournament support filtering rules
          </a>
          :
        </p>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>
            Receive{' '}
            <strong className="font-semibold">written permission</strong> from
            osu! support by contacting{' '}
            <a href="mailto:tournaments@ppy.sh">tournaments@ppy.sh</a> via email
            before using this tool in officially-supported tournaments.
          </li>
          <li>
            After creating a filter report, hosts must copy the provided forum
            post text exactly as-is and include it in their tournament forum
            post. Do not modify the filtering result.
          </li>
        </ol>
      </Callout>
      {filterBlocked ? (
        <Callout
          tone="warning"
          icon={Clock}
          title="Filtering is temporarily unavailable"
          data-testid="filtering-unavailable"
        >
          Ratings are currently recalculating, please check back later.
        </Callout>
      ) : (
        <FilteringForm
          onFilteringComplete={setFilteringResults}
          filteringResults={filteringResults}
        />
      )}
    </PageFrame>
  );
}
