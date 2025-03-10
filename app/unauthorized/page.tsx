import { auth } from '@/auth';
import { redirect, RedirectType } from 'next/navigation';
import { Roles } from '@osu-tournament-rating/otr-api-client';

export default async function Page() {
  const session = await auth();

  if (session?.user?.scopes?.includes(Roles.Whitelist)) {
    redirect('/', RedirectType.replace);
  }

  return (
    <div className="m-5 flex flex-col gap-2 rounded-4xl bg-accent p-10 text-center">
      <p className="font-mono text-4xl text-primary">Unauthorized</p>
      <p className="font-mono text-accent-foreground">
        o!TR is currently under whitelist-only access.
        <br />
        Please sign in or come back later!
      </p>
    </div>
  );
}
