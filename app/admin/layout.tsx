import React from 'react';
import styles from './layout.module.css';
import AdminNavigation from '@/components/AdminNavigation/AdminNavigation';
import { getSession } from '@/app/actions/session';
import { Roles } from '@osu-tournament-rating/otr-api-client';
import { redirect } from 'next/navigation';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Prevent non-admins from accessing any pages in the group
  const { user } = await getSession();
  if (!user?.scopes.includes(Roles.Admin)) {
    return redirect('/');
  }

  return (
    <div className={styles.adminLayout}>
      <div className={styles.navigationContainer}>
        <AdminNavigation />
      </div>
      <div className={'container'}>{children}</div>
    </div>
  );
}
