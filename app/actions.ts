'use server';

import {
  LeaderboardsQuerySchema,
  MatchesSubmitFormSchema,
  SessionUser,
  TournamentsQuerySchema,
  UserpageQuerySchema,
  defaultSessionUser,
  sessionOptions,
} from '@/lib/types';
import { getIronSession } from 'iron-session';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
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
      playerId: session?.playerId,
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
  session.playerId = loggedUser.playerId;
  session.osuId = loggedUser.osuId;
  session.osuCountry = loggedUser.country;
  session.osuPlayMode = loggedUser.settings.ruleset ?? '0';
  session.osuPlayModeSelected = loggedUser.settings.ruleset ?? '0'; // maybe to delete
  session.username = loggedUser.username;
  session.scopes = loggedUser.scopes;
  session.isLogged = true;

  await cookies().set(
    'OTR-user-selected-osu-mode',
    loggedUser.settings.ruleset ?? '0',
    {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1209600,
    }
  );

  await session.save();

  return NextResponse.redirect(new URL('/', process.env.REACT_APP_ORIGIN_URL));
}

export async function logout() {
  const session = await getSession();

  if (session) {
    try {
      session.destroy(); // delete the session made with IronSession - delete it's session cookie
      await cookies().delete('OTR-Refresh-Token'); // delete the cookie that contains the refresh token
      await cookies().delete('OTR-user-selected-osu-mode'); // delete the cookie that contains the selected osu mode
    } catch (error) {
      console.log(error);
    } finally {
      return redirect(new URL('/', process.env.REACT_APP_ORIGIN_URL));
    }
  }
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
    `https://osu.ppy.sh/oauth/authorize?client_id=${process.env.REACT_APP_OSU_CLIENT_ID}&redirect_uri=${process.env.REACT_APP_OSU_CALLBACK_URL}&response_type=code&scope=public+friends.read`
  );
}

export async function saveTournamentMatches(
  prevState: any,
  formData: FormData
) {
  const session = await getSession(true);

  /* IF USER IS UNAUTHORIZED REDIRECT TO HOMEPAGE */
  if (!session.id) return redirect('/');

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
      name: formData.get('tournamentName'),
      abbreviation: formData.get('tournamentAbbreviation'),
      forumUrl: formData.get('forumPostURL'),
      rankRangeLowerBound: parseInt(formData.get('rankRestriction')),
      lobbySize: parseInt(formData.get('teamSize')),
      ruleset: parseInt(formData.get('gameMode')),
      ids: matchIDs,
    });

    let tournamentSubmit = await fetch(
      `${process.env.REACT_APP_API_URL}/tournaments`,
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
    );

    if (!tournamentSubmit?.ok) {
      const errorMessage = await tournamentSubmit.text();

      return {
        error: {
          status: tournamentSubmit.status,
          text: tournamentSubmit.statusText,
          message: errorMessage,
        },
      };
    }

    return {
      success: {
        status: tournamentSubmit.status,
        text: tournamentSubmit.statusText,
        message: 'Tournament submitted successfully',
      },
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

  const osuMode =
    (await cookies().get('OTR-user-selected-osu-mode')?.value) ?? '0';

  /* PLAYERID */

  const { type, page, rank, rating, matches, winRate, tiers } = params;

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

  winRate
    ? Array.isArray(winRate)
      ? (paramsToProcess.winRate = winRate
          .map((value) => Number(value) / 100)
          .sort(compareNumbers))
      : (paramsToProcess.winRate = Array(winRate)
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

  /* Check winRate filter */
  if (queryCheck.data.winRate) {
    queryCheck.data.winRate[0] != null
      ? (backendObject['MinWinrate'] = queryCheck.data.winRate[0])
      : null;
    queryCheck.data.winRate[1] != null
      ? (backendObject['MaxWinrate'] = queryCheck.data.winRate[1])
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
    `${process.env.REACT_APP_API_URL}/leaderboards?ruleset=${osuMode}&${backendString}`,
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

export async function fetchDashboard(params: {}) {
  const session = await getSession(true);

  const osuMode =
    (await cookies().get('OTR-user-selected-osu-mode')?.value) ?? '0';

  let urlStringObject = {
    ruleset: osuMode,
  };

  const queryCheck = await UserpageQuerySchema.safeParse({
    time: params?.time,
  });

  // put time on the url only if the value is not undefined and without errors
  if (queryCheck.success && queryCheck.data.time) {
    let minDate = new Date();
    minDate.setDate(minDate.getDate() - params?.time);
    let year = minDate.getFullYear();
    let month = String(minDate.getMonth() + 1).padStart(2, '0');
    let day = String(minDate.getDate()).padStart(2, '0');
    minDate = `${year}-${month}-${day}`;

    urlStringObject.dateMin = minDate;
  }

  const urlParams = decodeURIComponent(
    new URLSearchParams(urlStringObject).toString()
  );

  let data = await fetch(
    `${process.env.REACT_APP_API_URL}/me/stats?${urlParams}`,
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

export async function fetchTournamentsPage(params: {}) {
  const { page } = params;

  const queryCheck = await TournamentsQuerySchema.safeParse({
    page: page ? +page : page,
  });

  if (!queryCheck.success) {
    return console.log('error');
  }

  let data = await fetch(`${process.env.REACT_APP_API_URL}/tournaments`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  data = await data.json();

  return data;
}

export async function fetchTournamentPage(tournament: string | number) {
  let data = await fetch(
    `${process.env.REACT_APP_API_URL}/tournaments/${tournament}?unfiltered=true`, //! to remove unfiltered
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  data = await data.json();

  return data;
}

export async function fetchMatchPage(match: string | number) {
  let data = await fetch(`${process.env.REACT_APP_API_URL}/matches/${match}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  data = await data.json();

  return data;
}

export async function fetchUserPageTitle(player: string | number) {
  const session = await getSession(true);

  let res = await fetch(
    `${process.env.REACT_APP_API_URL}/players/${player}`,
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

export async function fetchUserPage(player: string | number, params) {
  const session = await getSession(true);

  const osuMode =
    (await cookies().get('OTR-user-selected-osu-mode')?.value) ?? '0';

  let urlStringObject = {
    ruleset: osuMode,
  };

  if (session?.playerId) {
    urlStringObject.comparerId = session?.playerId;
  }

  const queryCheck = await UserpageQuerySchema.safeParse({
    time: params?.time,
  });

  // put time on the url only if the value is not undefined and without errors
  if (queryCheck.success && queryCheck.data.time) {
    let minDate = new Date();
    minDate.setDate(minDate.getDate() - params?.time);
    let year = minDate.getFullYear();
    let month = String(minDate.getMonth() + 1).padStart(2, '0');
    let day = String(minDate.getDate()).padStart(2, '0');
    minDate = `${year}-${month}-${day}`;

    urlStringObject.dateMin = minDate;
  }

  const urlParams = decodeURIComponent(
    new URLSearchParams(urlStringObject).toString()
  );

  let res = await fetch(
    `${process.env.REACT_APP_API_URL}/stats/${player}?${urlParams}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.accessToken}`,
      },
    }
  );

  if (!res?.ok) {
    return res?.status === 404 ? notFound() : redirect('/');
  }

  res = await res.json();

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

export async function fetchSearchData(prevState: any, formData: FormData) {
  const session = await getSession(true);

  if (!session.id) return redirect('/');

  let searchText = formData.get('search').trim();

  if (searchText === '')
    return {
      status: 'success',
      search: {
        players: [],
        tournaments: [],
        matches: [],
      },
    };

  let searchData = await fetch(
    `${process.env.REACT_APP_API_URL}/search?searchKey=${searchText}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': `${process.env.REACT_APP_ORIGIN_URL}`,
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  if (!searchData?.ok) {
    throw new Error('Error from server on search!');
  }

  searchData = await searchData.json();

  return {
    status: 'success',
    search: searchData,
  };
}
