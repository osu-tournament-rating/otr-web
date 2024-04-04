'use server';

import {
  LeaderboardsQuerySchema,
  MatchesSubmitFormSchema,
  SessionUser,
  defaultSessionUser,
  sessionOptions,
} from '@/lib/types';
import { getIronSession } from 'iron-session';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

export async function getSession(onlyData: boolean = false) {
  const session = await getIronSession<SessionUser>(cookies(), sessionOptions);

  if (!session.isLogged) {
    session.isLogged = defaultSessionUser.isLogged;
  }

  // onlyData field will be true only when the website need to get the fields without the full IronSession
  if (onlyData)
    return {
      isLogged: session?.isLogged,
      id: session?.id,
      userId: session?.userId,
      osuId: session?.osuId,
      osuCountry: session?.osuCountry,
      osuPlayMode: session?.osuPlayMode,
      osuPlayModeSelected: session?.osuPlayModeSelected,
      username: session?.username,
      scopes: session?.scopes,
      accessToken: session?.accessToken,
    };

  return session;
}

export async function login(cookie: {
  accessToken: string;
  refreshToken?: string;
  accessExpiration?: number;
}) {
  const session = await getSession();

  if (!cookie)
    return {
      error: {
        status: 400,
        text: 'Bad Request',
        message: 'Received bad cookies from osu!.',
      },
    };

  session.accessToken = cookie.accessToken;

  if (cookie?.refreshToken) {
    await cookies().set('OTR-Refresh-Token', cookie.refreshToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1209600,
    });
  }

  const loggedUser = await getLoggedUser(cookie.accessToken);

  if (loggedUser.error) {
    return NextResponse.redirect(
      new URL('/unauthorized', process.env.REACT_APP_ORIGIN_URL)
    );
  }

  session.id = loggedUser.id;
  session.userId = loggedUser.userId;
  session.osuId = loggedUser.osuId;
  session.osuCountry = loggedUser.osuCountry;
  session.osuPlayMode = loggedUser.osuPlayMode;
  session.osuPlayModeSelected = loggedUser.osuPlayMode;
  session.username = loggedUser.username;
  session.scopes = loggedUser.scopes;
  session.isLogged = true;

  await cookies().set('OTR-user-selected-osu-mode', loggedUser.osuPlayMode, {
    httpOnly: true,
    path: '/',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1209600,
  });

  await session.save();

  /* await changeOsuModeCookie(res.osuPlayMode); */
  return NextResponse.redirect(new URL('/', process.env.REACT_APP_ORIGIN_URL));
}

export async function getLoggedUser(accessToken: string) {
  let res = await fetch(`${process.env.REACT_APP_API_URL}/me`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': `${process.env.REACT_APP_ORIGIN_URL}`,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res?.ok) {
    const errorMessage = await res.text();

    return {
      error: {
        status: res.status,
        text: res.statusText,
        message: errorMessage,
      },
    };
  }

  res = await res.json();
  return res;
}

export async function refreshAccessToken() {
  let refreshToken = cookies().get('OTR-Refresh-Token')?.value || null;

  /* Return if there is no refresh token */
  if (refreshToken == null) return;

  let res = await fetch(
    `${process.env.REACT_APP_API_URL}/oauth/refresh?refreshToken=${refreshToken}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': `${process.env.REACT_APP_ORIGIN_URL}`,
      },
    }
  );

  if (!res?.ok) {
    const errorMessage = await res.text();

    console.log(errorMessage);

    return {
      error: {
        status: res?.status,
        text: res?.statusText,
        message: errorMessage,
      },
    };
  }

  res = await res.json();
  return res;
}

export async function revalidateUserData() {
  return revalidateTag('user-me');
}

export async function loginIntoWebsite() {
  return redirect(
    `https://osu.ppy.sh/oauth/authorize?client_id=${process.env.REACT_APP_OSU_CLIENT_ID}&redirect_uri=${process.env.REACT_APP_OSU_CALLBACK_URL}&response_type=code&scope=public`
  );
}

export async function saveTournamentMatches(
  prevState: any,
  formData: FormData
) {
  const session = await getSession(true);

  /* IF USER IS UNAUTHORIZED REDIRECT TO HOMEPAGE */
  if (!session.userId) return redirect('/');

  try {
    /* REGEX TO REMOVE ALL SPACES AND ENTERS */
    let matchIDs = await formData
      .get('matchLinks')
      .split(/\r?\n/g)
      .map((value: string) => {
        if (value.startsWith('https://osu.ppy.sh/community/matches/'))
          value = value.replace('https://osu.ppy.sh/community/matches/', '');

        if (value.startsWith('https://osu.ppy.sh/mp/')) {
          value = value.replace('https://osu.ppy.sh/mp/', '');
        }

        /* REGEX TO CHECK IF VALUE HAS ONLY DIGITS */
        if (!/^\d+$/.test(value)) {
          return value;
        }

        return parseFloat(value);
      });

    const data = MatchesSubmitFormSchema.parse({
      tournamentName: formData.get('tournamentName'),
      abbreviation: formData.get('tournamentAbbreviation'),
      forumPost: formData.get('forumPostURL'),
      rankRangeLowerBound: parseInt(formData.get('rankRestriction')),
      teamSize: parseInt(formData.get('teamSize')),
      mode: parseInt(formData.get('gameMode')),
      submitterId: session?.userId ?? 0,
      ids: matchIDs,
    });

    let isSubmissionVerified =
      formData.get('verifierCheckBox') == 'on' ?? false;

    await fetch(
      `${process.env.REACT_APP_API_URL}/tournaments?verified=${isSubmissionVerified}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': `${process.env.REACT_APP_ORIGIN_URL}`,
          Authorization: `Bearer ${session.accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      }
    )
      .then((response) => {
        if (response.status !== 201) {
          throw new Error({
            issues: [
              {
                path: ['serverError'],
                message: response.body,
              },
            ],
          });
        }

        return {
          status: 'success',
        };
      })
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.log(JSON.parse(error.message));
      });

    return {
      status: 'success',
    };
  } catch (error) {
    let errors = {};

    if (error) {
      if (error?.issues?.length > 0) {
        error?.issues.forEach((err) => {
          return (errors[`${err.path[0]}`] = err.message);
        });
      }
    }

    return {
      status: 'error',
      errors,
    };
  }
}

export async function getOsuModeCookie() {
  return cookies().get('OTR-user-selected-osu-mode');
}

export async function changeOsuModeCookie(mode?: string) {
  await cookies().set('OTR-user-selected-osu-mode', mode ?? '0');
  return;
}

export async function resetLeaderboardFilters(string: string) {
  return redirect(string);
}

export async function applyLeaderboardFilters(params: {}) {
  let urlStringObject = {};

  Object.keys(params).forEach((key) => {
    if (key === 'type') {
      return (urlStringObject[key] = params[key]);
    }

    if (key === 'page') {
      return (urlStringObject[key] = 1);
    }

    if (Array.isArray(params[key]) && params[key].length > 1) {
      let string = '';

      params[key].forEach((value, index) => {
        string += `${value}${index < params[key].length - 1 ? `&${key}=` : ''}`;
      });

      return (urlStringObject[key] = string);
    }
    params[key].length > 0 ? (urlStringObject[key] = params[key]) : null;
  });

  let urlParams = decodeURIComponent(
    new URLSearchParams(urlStringObject).toString()
  );

  if (urlParams) return redirect(`/leaderboards?${urlParams}`);
}

export async function fetchLeaderboard(params: {}) {
  const session = await getSession(true);

  /* MISSING MODE,  PLAYERID */

  const { type, page, rank, rating, matches, winrate, tiers } = params;

  const tierFilters = {
    bronze: 'bronze',
    silver: 'silver',
    gold: 'gold',
    platinum: 'platinum',
    emerald: 'emerald',
    diamond: 'diamond',
    master: 'master',
    grandmaster: 'grandmaster',
    'elite-grandmaster': 'elitegrandmaster',
  };

  function compareNumbers(a: number, b: number) {
    return a - b;
  }

  let paramsToProcess: {
    [key: string]: any;
  } = {};

  rank
    ? Array.isArray(rank)
      ? (paramsToProcess.rank = rank.map(Number).sort(compareNumbers))
      : (paramsToProcess.rank = Array(rank).map(Number).sort(compareNumbers))
    : undefined;

  matches
    ? Array.isArray(matches)
      ? (paramsToProcess.matches = matches.map(Number).sort(compareNumbers))
      : (paramsToProcess.matches = Array(matches)
          .map(Number)
          .sort(compareNumbers))
    : undefined;

  rating
    ? Array.isArray(rating)
      ? (paramsToProcess.rating = rating.map(Number).sort(compareNumbers))
      : (paramsToProcess.rating = Array(rating)
          .map(Number)
          .sort(compareNumbers))
    : undefined;

  winrate
    ? Array.isArray(winrate)
      ? (paramsToProcess.winrate = winrate
          .map((value) => Number(value) / 100)
          .sort(compareNumbers))
      : (paramsToProcess.winrate = Array(winrate)
          .map((value) => Number(value) / 100)
          .sort(compareNumbers))
    : undefined;

  tiers
    ? Array.isArray(tiers)
      ? (paramsToProcess.tiers = tiers)
      : (paramsToProcess.tiers = Array(tiers))
    : undefined;

  const queryCheck = await LeaderboardsQuerySchema.safeParse({
    type: type,
    page: page ? +page : page,
    ...paramsToProcess,
  });

  if (!queryCheck.success) {
    return console.log('error');
  }

  let backendObject: {
    [key: string]: any;
  } = {};

  /* Assign leaderboard type */
  if (queryCheck.data.type) {
    queryCheck.data.type === 'global'
      ? (backendObject.chartType = 0)
      : queryCheck.data.type === 'country'
      ? (backendObject.chartType = 1)
      : null;
  }

  /* Check page number */
  if (queryCheck.data.page) {
    backendObject.page = queryCheck.data.page - 1;
  }

  /* Assign page size */
  backendObject.pageSize = queryCheck.data.pageSize;

  /* Check rank filter */
  if (queryCheck.data.rank) {
    queryCheck.data.rank[0] != null
      ? (backendObject['MinRank'] = queryCheck.data.rank[0])
      : null;
    queryCheck.data.rank[1] != null
      ? (backendObject['MaxRank'] = queryCheck.data.rank[1])
      : null;
  }

  /* Check matches filter */
  if (queryCheck.data.matches) {
    queryCheck.data.matches[0] != null
      ? (backendObject['MinMatches'] = queryCheck.data.matches[0])
      : null;
    queryCheck.data.matches[1] != null
      ? (backendObject['MaxMatches'] = queryCheck.data.matches[1])
      : null;
  }

  /* Check ratings filter */
  if (queryCheck.data.rating) {
    queryCheck.data.rating[0] != null
      ? (backendObject['MinRating'] = queryCheck.data.rating[0])
      : null;
    queryCheck.data.rating[1] != null
      ? (backendObject['MaxRating'] = queryCheck.data.rating[1])
      : null;
  }

  /* Check winrate filter */
  if (queryCheck.data.winrate) {
    queryCheck.data.winrate[0] != null
      ? (backendObject['MinWinrate'] = queryCheck.data.winrate[0])
      : null;
    queryCheck.data.winrate[1] != null
      ? (backendObject['MaxWinrate'] = queryCheck.data.winrate[1])
      : null;
  }

  /* Check included tiers filter */
  if (queryCheck.data.tiers) {
    queryCheck.data.tiers.forEach((tier) => {
      backendObject[tierFilters[tier]] = true;
    });
  }

  let backendString = new URLSearchParams(backendObject).toString();

  let data = await fetch(
    `${process.env.REACT_APP_API_URL}/leaderboards?${backendString}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  data = await data.json();

  return data;
}

export async function fetchDashboard() {
  const session = await getSession(true);

  const osuMode =
    (await cookies().get('OTR-user-selected-osu-mode')?.value) ?? '0';

  let data = await fetch(
    `${process.env.REACT_APP_API_URL}/me/stats?mode=${osuMode}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  data = await data.json();

  return data;
}

export async function fetchUserPageTitle(player: string | number) {
  const session = await getSession(true);

  let res = await fetch(
    `${process.env.REACT_APP_API_URL}/players/${player}/info`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  if (res?.ok) {
    res = await res.json();
    return res;
  }

  return null;
}

export async function fetchUserPage(player: string | number) {
  const session = await getSession(true);

  let res = await fetch(
    `${process.env.REACT_APP_API_URL}/stats/${player}${
      session?.userId ? `?comparerId=${session?.userId}` : ''
    }`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
    }
  );

  if (!res?.ok) {
    return redirect('/');
  }

  res = await res.json();

  /* TEMPORARY BEHAVIOR */
  if (res?.generalStats === null) {
    return redirect('/');
  }

  return res;
}

export async function paginationParamsToURL(params: {}) {
  let url = '';

  if (Object.keys(params).length > 0) {
    Object.keys(params).forEach((key, index) => {
      if (key === 'page') return;

      if (Array.isArray(params[key]) && params[key].length > 1) {
        let string = `${index !== 0 ? '&' : ''}${key}=`;

        params[key].forEach((value, index) => {
          string += `${value}${
            index < params[key].length - 1 ? `&${key}=` : ''
          }`;
        });

        return (url += `${string}`);
      }

      return (url += `${index !== 0 ? '&' : ''}${key}=${params[key]}${
        index === Object.keys(params).length - 1 ? '&' : ''
      }`);
    });
  }

  return url;
}
