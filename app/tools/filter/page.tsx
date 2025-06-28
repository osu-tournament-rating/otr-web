'use client';

import FilteringForm from '@/components/filtering/FilteringForm';
import { Card } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import { useState } from 'react';
import { FilteringResultDTO } from '@osu-tournament-rating/otr-api-client';

export default function FilteringPage() {
  const [filteringResults, setFilteringResults] =
    useState<FilteringResultDTO | null>(null);

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <Card className="flex w-full flex-col items-center justify-center gap-4">
        <div className="flex flex-row items-center gap-2 text-xl font-bold text-primary md:text-2xl">
          <Filter className="size-9" />
          Tournament Registrant Filtering
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-md flex text-muted-foreground">
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
