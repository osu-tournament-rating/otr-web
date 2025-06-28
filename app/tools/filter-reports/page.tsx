import { FilterReportView } from '@/components/filtering/FilterReportView';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Filter Reports',
};

export default function FilterReportsPage() {
  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Filter Reports</h1>
        <p className="text-muted-foreground">
          View Tournament Registrant Filtering reports by entering a report ID.
          These reports show detailed filtering results for tournament
          participants.
        </p>
      </div>
      <FilterReportView />
    </div>
  );
}
