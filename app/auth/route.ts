import { redirect } from 'next/navigation';
import { clearCookie, getCookieValue, getSession } from '@/app/actions/session';
import { CookieNames } from '@/lib/types';
import { MeWrapper, OAuthWrapper } from '@osu-tournament-rating/otr-api-client';
import { apiWrapperConfiguration } from '@/lib/api';

export async function GET(request: Request) {
  // Extract auth code and xsrf token from the request
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token = searchParams.get('state');
  // Get the stored xsrf token
  const storedToken = await getCookieValue(CookieNames.AuthXSRFToken);

  // Token should be cleared regardless of success
  await clearCookie(CookieNames.AuthXSRFToken);

  if (!storedToken || !token || !code || token !== storedToken) {
    return redirect('/unauthorized');
  }

  const session = await getSession();

  try {
    // Exchange osu! auth code for otr access credentials
    const {
      result: { accessToken, refreshToken },
    } = await new OAuthWrapper(apiWrapperConfiguration).authorize({ code });
    session.accessToken = accessToken;
    session.refreshToken = refreshToken;
    await session.save();

    // Get user data
    const { result: user } = await new MeWrapper(apiWrapperConfiguration).get();
    session.user = user;
    session.isLogged = true;
    await session.save();
  } catch {
    session.destroy();
    return redirect('/unauthorized');
  }

  return redirect('/');
}
