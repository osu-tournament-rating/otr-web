'use server';

import { apiWrapperConfiguration } from '@/lib/api';
import { CookieNames, UserpageQuerySchema } from '@/lib/types';
import { PlayersWrapper, Ruleset } from '@osu-tournament-rating/otr-api-client';
import { notFound, redirect } from 'next/navigation';
import { getCookieValue } from './session';

export async function fetchPlayerStats(player: string | number, params) {
  const osuMode = await getCookieValue<Ruleset>(CookieNames.SelectedRuleset);

  const queryCheck = UserpageQuerySchema.safeParse({
    time: params?.time,
  });

  const wrapper = new PlayersWrapper(apiWrapperConfiguration);

  let minDate = undefined;
  if (queryCheck.success && queryCheck.data.time) {
    minDate = new Date();
    minDate.setDate(minDate.getDate() - params?.time);
  }

  const statsResponse = await wrapper.getStats({
    key: player as string,
    ruleset: osuMode ?? Ruleset.Osu,
    dateMin: minDate,
  });

  if (statsResponse.status != 200) {
    return statsResponse.status === 404 ? notFound() : redirect('/');
  }

  return statsResponse.result;
}
