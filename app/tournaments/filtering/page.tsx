import FilteringForm from '@/components/filtering/FilteringForm';
import DateTransparencyNotice from '@/components/filtering/DateTransparencyNotice';
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
          Tournament Player Filtering
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-md flex text-muted-foreground">
            Filter your tournament registrants based on rating and eligibility
            criteria.
          </span>
          <span className="text-sm text-muted-foreground">
            Tournament hosts can use this tool to determine player eligibility
            for their tournaments.
          </span>
        </div>
      </Card>
      <DateTransparencyNotice />
      <FilteringForm />
    </div>
  );
}
