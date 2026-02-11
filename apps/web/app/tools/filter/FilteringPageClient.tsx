'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
      <Alert className="border-warning/50 bg-warning/10 dark:border-warning/50 dark:bg-warning/10">
        <AlertTriangle className="text-warning-foreground h-4 w-4 dark:text-yellow-400" />
        <AlertTitle className="text-warning-foreground font-bold dark:text-yellow-100">
          Host Compliance
        </AlertTitle>
        <AlertDescription className="text-warning-foreground/90 dark:text-yellow-100/90">
          <div className="mt-2 space-y-2">
            <p>
              <strong>
                Hosts must comply with the{' '}
                <Link
                  className="text-primary underline"
                  href="https://osu.ppy.sh/wiki/en/Tournaments/Official_support#registrant-filtering-and-seeding"
                >
                  official tournament support filtering rules
                </Link>
                :
              </strong>
            </p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                Receive <strong>written permission</strong> from osu! support by
                contacting{' '}
                <a
                  className="text-primary underline"
                  href="mailto:tournaments@ppy.sh"
                >
                  tournaments@ppy.sh
                </a>{' '}
                via email before using this tool in officially-supported
                tournaments.
              </li>
              <li>
                After creating a filter report, hosts must copy the provided
                forum post text exactly as-is and include it in their tournament
                forum post. Do not modify the filtering result.
              </li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>
      <FilteringForm
        onFilteringComplete={setFilteringResults}
        filteringResults={filteringResults}
      />
    </div>
  );
}
