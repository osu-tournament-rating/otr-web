import React from 'react';
import styles from './layout.module.css';
import AdminNavigation from '@/components/AdminNavigation/AdminNavigation';
import { getSession } from '@/app/actions/session';
import { redirect } from 'next/navigation';
import clsx from 'clsx';
import { isAdmin } from '@/lib/api';

export default async function Layout({
  children,
  players,
}: {
  children: React.ReactNode;
  players: React.ReactNode;
}) {
  // Prevent non-admins from accessing any pages in the group
  const { user } = await getSession();
  if (!isAdmin(user?.scopes)) {
    return redirect('/');
  }

  return (
    <div className={styles.adminLayout}>
      <div className={styles.navigationContainer}>
        <AdminNavigation />
      </div>
      <div className={clsx(styles.adminContent, 'content')}>
        {children}
        {players}
      </div>
    </div>
  );
}
