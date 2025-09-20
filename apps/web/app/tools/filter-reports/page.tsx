import { FilterReportView } from '@/components/filtering/FilterReportView';
import { BetaWarningBanner } from '@/components/filtering/BetaWarningBanner';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Filter Reports',
};

export default function FilterReportsPage() {
  return (
    <div className="container mx-auto flex flex-col gap-4 px-4 md:gap-2 md:px-0">
      <BetaWarningBanner />
      <div className="mb-4 flex flex-col gap-2 sm:mb-6 md:mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Filter Reports</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          View Tournament Registrant Filtering reports by entering a report ID.
          These reports show detailed filtering results for tournament
          participants.
        </p>
      </div>
      <FilterReportView />
    </div>
  );
}
