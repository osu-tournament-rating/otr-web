import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/lib/auth/auth';

import MyReportsClient from './MyReportsClient';
import { MyReportsFrame, MyReportsPanelSkeleton } from './MyReportsFrame';

export const metadata: Metadata = {
  title: 'My reports',
};

/** Every signed-in visitor's own reports, admins included. */
export default async function ReportsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect('/unauthorized');
  }

  return (
    <MyReportsFrame data-testid="my-reports">
      <Suspense fallback={<MyReportsPanelSkeleton />}>
        <MyReportsClient />
      </Suspense>
    </MyReportsFrame>
  );
}
