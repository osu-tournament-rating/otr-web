import { redirect } from 'next/navigation';
import { login } from '@/app/actions/login'
import { getSession } from '@/app/actions/session';

export async function GET(request: Request) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!session.osuOauthState) {
    console.log('State was not stored');
    return redirect('/');
  }

  if (!code) {
  console.log('Code was not given');
    return redirect('/');
  }

  if (!state || session.osuOauthState !== state) {
  console.log('State was not given or does not match the stored state');
    return redirect('/');
  }

  return await login(code);
}
