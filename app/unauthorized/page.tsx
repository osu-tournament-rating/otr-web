import { getCustomHeaderValue } from '@/lib/actions/headers';
import { auth } from '@/auth';
import { redirect, RedirectType } from 'next/navigation';
import { Roles } from '@osu-tournament-rating/otr-api-client';

export default async function Page() {
  const session = await auth();

  if (session?.user?.scopes?.includes(Roles.Whitelist)) {
    redirect('/', RedirectType.replace);
  }

  const error = await getCustomHeaderValue('x-otr-session-error');

  return (
    <div>
      <h1>Unauthorized</h1>
      <span>Error: {error ?? 'none'}</span>
    </div>
  );
}
