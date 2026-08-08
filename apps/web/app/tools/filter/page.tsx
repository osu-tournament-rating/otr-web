import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { readRatingTimestamps } from '@/lib/db/rating-utils';
import { resolveMaintenanceWindowActive } from '@/lib/maintenance-window';
import FilteringPageClient from '@/app/tools/filter/FilteringPageClient';

export default async function FilteringPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect('/unauthorized');
  }

  const filterBlocked = resolveMaintenanceWindowActive(
    headersList,
    await readRatingTimestamps(db)
  );

  return <FilteringPageClient filterBlocked={filterBlocked} />;
}
