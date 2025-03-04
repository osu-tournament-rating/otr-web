'use client';

import { Button } from '../ui/button';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function LoginButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <>
        <Button className="cursor-pointer" onClick={() => signOut()}>
          Logout
        </Button>
      </>
    );
  }

  return (
    <>
      <Button className="cursor-pointer" onClick={() => signIn('otr')}>
        Login
      </Button>
    </>
  );
}
