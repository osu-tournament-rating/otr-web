'use server';

import { getSessionData } from '@/app/actions/session';
import { apiWrapperConfiguration } from '@/lib/auth';
import {
  LeaderboardsQuerySchema,
  TournamentsQuerySchema,
  UserpageQuerySchema,
} from '@/lib/types';
import {
  MatchesWrapper,
  PlayersWrapper,
  TournamentsWrapper,
  Ruleset,
} from '@osu-tournament-rating/otr-api-client';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

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
  const session = await getSessionData();

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
    backendObject.page = queryCheck.data.page;
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
  const session = await getSessionData();

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
  const session = await getSessionData();

  /* IF USER IS UNAUTHORIZED REDIRECT TO HOMEPAGE */
  if (!session.id) return redirect('/');

  const { page } = params;

  const queryCheck = await TournamentsQuerySchema.safeParse({
    page: page ? +page : page,
  });

  if (!queryCheck.success) {
    return console.log('error');
  }

  const wrapper = new TournamentsWrapper(apiWrapperConfiguration);

  let data = await wrapper.list({
    page: 1,
    pageSize: 30,
    verified: false,
  });

  return data.result;
}

export async function fetchTournamentPage(tournamentId: number | string) {
  const session = await getSessionData();

  /* IF USER IS UNAUTHORIZED REDIRECT TO HOMEPAGE */
  if (!session.id) return redirect('/');

  const wrapper = new TournamentsWrapper(apiWrapperConfiguration);

  let data = await wrapper.get({
    id: tournamentId as number,
    verified: false,
  });

  return data.result;
}

export async function fetchMatchPage(matchId: string | number) {
  const session = await getSessionData();

  /* IF USER IS UNAUTHORIZED REDIRECT TO HOMEPAGE */
  if (!session.id) return redirect('/');

  const wrapper = new MatchesWrapper(apiWrapperConfiguration);

  let data = await wrapper.get({
    id: matchId as number,
  });

  return data.result;
}

export async function fetchUserPageTitle(player: string | number) {
  const session = await getSessionData();

  let res = await fetch(`${process.env.REACT_APP_API_URL}/players/${player}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (res?.ok) {
    res = await res.json();
    return res;
  }

  return null;
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
  const session = await getSessionData();

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

export async function fetchTournamentsForAdminPage(params: {}) {
  const session = await getSessionData();

  /* IF USER IS UNAUTHORIZED REDIRECT TO HOMEPAGE */
  if (!session.id) return redirect('/');

  const wrapper = new TournamentsWrapper(apiWrapperConfiguration);

  let data = await wrapper.list({
    page: 1,
    pageSize: 30,
    verified: false,
  });

  return data.result;
}

export async function adminPanelSaveVerified(params) {
  const session = await getSessionData();

  /* IF USER IS UNAUTHORIZED REDIRECT TO HOMEPAGE */
  if (!session.id) return redirect('/');

  const body = [
    {
      path: '/verificationStatus',
      op: 'replace',
      value: params.status,
    },
    {
      path: '/rejectionReason',
      op: 'replace',
      value: 0,
    },
  ];

  let data = await fetch(
    `${process.env.REACT_APP_API_URL}/${params.path}/${params.id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
    }
  );

  if (!data.ok) {
    return {
      error: { statusText: data.statusText, status: data.status },
    };
  }

  data = await data.json();

  return data;
}
