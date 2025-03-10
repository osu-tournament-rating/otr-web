import { auth } from '@/auth';
import { redirect, RedirectType } from 'next/navigation';
import { Roles } from '@osu-tournament-rating/otr-api-client';

export default async function Page() {
  const session = await auth();

  if (session?.user?.scopes?.includes(Roles.Whitelist)) {
    redirect('/', RedirectType.replace);
  }

  return (
    <div className="flex flex-col bg-accent p-10 m-5 rounded-4xl">
      <p className="text-4xl font-mono">Unauthorized</p>
      <p className="text-accent-foreground font-mono">
        o!TR is currently under whitelist-only access.
        <br />
        Please sign in or come back later!
      </p>
    </div>
  );
}
