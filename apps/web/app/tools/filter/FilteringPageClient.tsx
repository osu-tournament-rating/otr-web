'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import FilteringForm from '@/components/filtering/FilteringForm';
import { BetaWarningBanner } from '@/components/filtering/BetaWarningBanner';
import { Card } from '@/components/ui/card';
import { FilteringResult } from '@/lib/orpc/schema/filtering';

export default function FilteringPageClient() {
  const [filteringResults, setFilteringResults] =
    useState<FilteringResult | null>(null);

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 md:gap-2 md:px-0">
      <BetaWarningBanner />
      <Card className="flex flex-col items-center justify-center gap-3 px-4 py-6 sm:gap-4 sm:px-6">
        <div className="text-primary flex flex-row items-center gap-2 text-lg font-bold sm:text-xl md:text-2xl">
          <Filter className="size-7 sm:size-8 md:size-9" />
          Tournament Registrant Filtering
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-muted-foreground text-sm sm:text-base">
            Filter your tournament registrants based on rating and other
            eligibility criteria.
          </span>
        </div>
      </Card>
      <FilteringForm
        onFilteringComplete={setFilteringResults}
        filteringResults={filteringResults}
      />
    </div>
  );
}
