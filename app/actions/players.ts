import { apiWrapperConfiguration } from '@/lib/auth';
import { UserpageQuerySchema } from '@/lib/types';
import { PlayersWrapper, Ruleset } from '@osu-tournament-rating/otr-api-client';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export async function fetchPlayerStats(player: string | number, params) {
  const osuMode =
    ((await cookies().get('OTR-user-selected-osu-mode')?.value) as
      | Ruleset
      | undefined) ?? Ruleset.Osu;

  const queryCheck = await UserpageQuerySchema.safeParse({
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
    ruleset: osuMode,
    dateMin: minDate,
  });

  if (statsResponse.status != 200) {
    return statsResponse.status === 404 ? notFound() : redirect('/');
  }

  return statsResponse.result;
}
