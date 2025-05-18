'use server';

import { redirect } from 'next/navigation';
import { auth } from '../api/client';

export async function login(redirectUrl: string) {
  redirect(
    auth.getAbsoluteOperationPath('login') + `?redirectUri=${redirectUrl}`
  );
}

export async function logout(redirectUrl: string) {
  redirect(
    auth.getAbsoluteOperationPath('logout') + `?redirectUri=${redirectUrl}`
  );
}
