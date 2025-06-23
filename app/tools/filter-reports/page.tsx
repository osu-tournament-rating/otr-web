import { FilterReportViewer } from '@/components/filtering/FilterReportViewer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Filter Reports',
};

export default function FilterReportsPage() {
  return (
    <main className="container mx-auto flex flex-col py-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Filter Reports</h1>
        <p className="text-muted-foreground">
          View Tournament Registrant Filtering reports by entering a report ID.
          These reports show detailed filtering results for tournament
          participants.
        </p>
      </div>
      <FilterReportViewer />
    </main>
  );
}
