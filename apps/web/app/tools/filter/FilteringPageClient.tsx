'use client';

import { useState } from 'react';
import FilteringForm from '@/components/filtering/FilteringForm';
import { FilteringResult } from '@/lib/orpc/schema/filtering';

export default function FilteringPageClient() {
  const [filteringResults, setFilteringResults] =
    useState<FilteringResult | null>(null);

  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 md:gap-2 md:px-0">
      <div className="mb-4 flex flex-col gap-2 sm:mb-6 md:mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Tournament Registrant Filtering
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Filter your tournament registrants based on rating eligibility
          criteria.
        </p>
      </div>
      <FilteringForm
        onFilteringComplete={setFilteringResults}
        filteringResults={filteringResults}
      />
    </div>
  );
}
