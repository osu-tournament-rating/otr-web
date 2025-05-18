import { redirect, RedirectType } from 'next/navigation';
import { Roles } from '@osu-tournament-rating/otr-api-client';
import { getSession } from '@/lib/api/server';

export default async function Page() {
  const session = await getSession();

  if (session?.scopes?.includes(Roles.Whitelist)) {
    redirect('/', RedirectType.replace);
  }

  return (
    <div className="rounded-4xl bg-card m-5 flex flex-col gap-2 p-10 text-center">
      <p className="text-primary font-mono text-4xl">Unauthorized</p>
      <p className="text-accent-foreground font-mono">
        o!TR is currently under whitelist-only access.
        <br />
        Please sign in or come back later!
      </p>
    </div>
  );
}
