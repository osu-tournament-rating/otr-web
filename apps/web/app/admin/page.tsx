import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

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
      <AdminDashboardClient />
    </div>
  );
}
