import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import FilteringPageClient from '@/app/tools/filter/FilteringPageClient';

export default async function FilteringPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect('/unauthorized');
  }

  return <FilteringPageClient />;
}
