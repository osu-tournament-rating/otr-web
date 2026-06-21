import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import MyReportsClient from './MyReportsClient';
import { auth } from '@/lib/auth/auth';
import { hasAdminScope } from '@/lib/auth/roles';

export default async function ReportsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect('/unauthorized');
  }

  // Admins manage every report from the dedicated admin view.
  if (hasAdminScope(session.dbUser?.scopes ?? [])) {
    redirect('/admin/reports');
  }

  return (
    <div className="flex flex-col gap-10" data-testid="my-reports">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-8 text-primary" />
          <div>
            <h1
              className="text-3xl font-semibold"
              data-testid="my-reports-heading"
            >
              Your Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Track the status of data issues you&apos;ve reported
            </p>
          </div>
        </div>
      </header>

      <MyReportsClient />
    </div>
  );
}
