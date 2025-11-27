import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import AdminReportsClient from './AdminReportsClient';
import { auth } from '@/lib/auth/auth';
import { hasAdminScope } from '@/lib/auth/roles';

export default async function AdminReportsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !hasAdminScope(session.dbUser?.scopes ?? [])) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-primary size-8" />
          <div>
            <h1 className="text-3xl font-semibold">Data Reports</h1>
            <p className="text-muted-foreground text-sm">
              Review and resolve user-submitted data issue reports
            </p>
          </div>
        </div>
      </header>

      <AdminReportsClient />
    </div>
  );
}
