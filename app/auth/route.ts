import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { setLoginCookies } from '../actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  await fetch(`${process.env.REACT_APP_API_URL}/oauth/authorize?code=${code}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': `${process.env.REACT_APP_ORIGIN_URL}`,
      Authorization: `${process.env.REACT_APP_AUTHORIZATION_SECRET}`,
    },
  })
    .then((response) => {
      if (response.status !== 200) {
        throw new Error('Authorization failed!');
      }

      return response.json();
    })
    .then(async (data) => {
      if (data) {
        return await setLoginCookies(data);
      }
    })
    .catch((error) => {
      console.error(error);
    });

  return redirect('/');
}
