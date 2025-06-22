'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Calendar } from 'lucide-react';

export default function DateTransparencyNotice() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="text-blue-900 dark:text-blue-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            <strong>Important:</strong> When using this tool for your
            tournament, always display the date of use on your forum post for
            transparency.
          </span>
          <div className="flex items-center gap-1 font-semibold">
            <Calendar className="h-4 w-4" />
            <span>Today: {currentDate}</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
