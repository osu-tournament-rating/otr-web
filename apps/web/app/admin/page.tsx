import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

import AdminDashboardClient from './AdminDashboardClient';
import { auth } from '@/lib/auth/auth';
import { hasAdminScope } from '@/lib/auth/roles';

export default async function AdminDashboardPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !hasAdminScope(session.dbUser?.scopes ?? [])) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-primary size-8" />
          <div>
            <h1 className="text-3xl font-semibold">Admin</h1>
          </div>
        </div>
      </header>

      <AdminDashboardClient />
    </div>
  );
}
