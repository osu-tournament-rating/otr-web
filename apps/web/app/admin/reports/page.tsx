import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/lib/auth/auth';
import { hasAdminScope } from '@/lib/auth/roles';

import AdminReportsClient from './AdminReportsClient';
import {
  AdminReportsFrame,
  AdminReportsPanelSkeleton,
} from './AdminReportsFrame';

export const metadata: Metadata = {
  title: 'Data reports',
};

export default async function AdminReportsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !hasAdminScope(session.dbUser?.scopes ?? [])) {
    redirect('/unauthorized');
  }

  return (
    <AdminReportsFrame data-testid="admin-reports">
      <Suspense fallback={<AdminReportsPanelSkeleton />}>
        <AdminReportsClient />
      </Suspense>
    </AdminReportsFrame>
  );
}
