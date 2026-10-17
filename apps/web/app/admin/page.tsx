import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { auth } from '@/lib/auth/auth';
import { hasAdminScope } from '@/lib/auth/roles';

import AdminDashboardClient from './AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Admin',
};

export default async function AdminDashboardPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || !hasAdminScope(session.dbUser?.scopes ?? [])) {
    redirect('/unauthorized');
  }

  return (
    <PageFrame data-testid="admin-dashboard">
      <PageHeader
        icon={ShieldCheck}
        title={<span data-testid="admin-heading">Admin</span>}
      />
      <AdminDashboardClient />
    </PageFrame>
  );
}
