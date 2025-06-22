import FilteringForm from '@/components/filtering/FilteringForm';
import FilterComplianceNotice from '@/components/filtering/FilterComplianceNotice';
import { Card } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Player Filtering | o!TR',
  description:
    'Filter tournament registrants based on rating and eligibility criteria',
};

export default function FilteringPage() {
  return (
    <div className="mx-auto flex w-full flex-col items-center justify-center gap-3">
      <Card className="flex w-full flex-col items-center justify-center gap-4">
        <div className="flex flex-row items-center gap-2 text-xl font-bold text-primary md:text-2xl">
          <Filter className="size-9" />
          Tournament Registrant Filtering
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-md flex text-muted-foreground">
            Filter your tournament registrants based on rating and other eligibility
            criteria.
          </span>
        </div>
      </Card>
      <FilterComplianceNotice />
      <FilteringForm />
    </div>
  );
}
