import { describe, expect, test } from 'bun:test';

import { fakeApi, procedure } from '../../__tests__/fake-api';
import {
  ctx,
  tournamentDetail,
  tournamentList,
} from '../../__tests__/fixtures';
import { VerificationStatus } from '@otr/core/osu';

import { ReplyError } from '../../command';
import { tournament } from '../tournament';

const options = (name: string) => ({
  string: () => name,
  integer: () => null,
});

describe('/tournament', () => {
  test('a numeric value from autocomplete fetches by id', async () => {
    const list = procedure(tournamentList);
    const get = procedure(tournamentDetail);
    const reply = await tournament.execute({
      options: options('512'),
      api: fakeApi({ tournaments: { list, get } }),
      ctx,
    });
    expect(list).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith({ id: 512 });
    expect(reply.embeds[0].title).toBe('Corsace Open 2025 (CO25)');
  });

  test('free text searches by relevance and opens the first hit', async () => {
    const list = procedure(tournamentList);
    const get = procedure(tournamentDetail);
    await tournament.execute({
      options: options('corsace'),
      api: fakeApi({ tournaments: { list, get } }),
      ctx,
    });
    expect(list.mock.calls[0][0]).toEqual({
      searchQuery: 'corsace',
      sort: 3,
      page: 1,
      pageSize: 25,
    });
    expect(get).toHaveBeenCalledWith({ id: 512 });
  });

  test('free text prefers a verified exact abbreviation, then a verified hit, then any exact abbreviation', async () => {
    const rejected = {
      ...tournamentList[0],
      id: 900,
      name: 'Oscillating Wincon Clash',
      abbreviation: 'OWC',
      verificationStatus: VerificationStatus.Rejected,
    };
    const worldCup = {
      ...tournamentList[1],
      id: 901,
      name: 'osu! World Cup 2025',
      abbreviation: 'OWC2025',
    };
    const verifiedExact = { ...worldCup, id: 902, abbreviation: 'OWC' };
    const get = procedure(tournamentDetail);
    const run = async (query: string, hits: typeof tournamentList) => {
      get.mockClear();
      await tournament.execute({
        options: options(query),
        api: fakeApi({ tournaments: { list: procedure(hits), get } }),
        ctx,
      });
      return get.mock.calls[0][0];
    };
    expect(await run('OWC', [rejected, worldCup])).toEqual({ id: 901 });
    expect(await run('owc', [rejected, worldCup, verifiedExact])).toEqual({
      id: 902,
    });
    expect(
      await run('OWC', [
        rejected,
        { ...worldCup, verificationStatus: VerificationStatus.Rejected },
      ])
    ).toEqual({ id: 900 });
    expect(await run('zzz', [rejected])).toEqual({ id: 900 });
  });

  test('no hit raises the not-found copy', async () => {
    const list = procedure([]);
    await expect(
      tournament.execute({
        options: options('zzz'),
        api: fakeApi({ tournaments: { list } }),
        ctx,
      })
    ).rejects.toThrow(new ReplyError('No tournament matches "zzz".'));
  });

  test('autocomplete lists abbreviation, name, and year with the id as value', async () => {
    const list = procedure(tournamentList);
    const choices = await tournament.autocomplete!({
      name: 'name',
      value: 'co',
      api: fakeApi({ tournaments: { list } }),
    });
    expect(list.mock.calls[0][0]).toEqual({
      searchQuery: 'co',
      sort: 3,
      page: 1,
      pageSize: 25,
    });
    expect(list.mock.calls[0][1]).toMatchObject({
      signal: expect.any(AbortSignal),
    });
    expect(choices[0]).toEqual({
      name: 'CO25 — Corsace Open 2025 (2025)',
      value: '512',
    });
  });

  test('autocomplete names the status of an unverified tournament', async () => {
    const list = procedure([
      { ...tournamentList[0], verificationStatus: VerificationStatus.Rejected },
    ]);
    const [choice] = await tournament.autocomplete!({
      name: 'name',
      value: 'co',
      api: fakeApi({ tournaments: { list } }),
    });
    expect(choice.name).toBe('CO25 — Corsace Open 2025 (2025) · rejected');
  });

  test('autocomplete answers nothing for blank input', async () => {
    const list = procedure(tournamentList);
    expect(
      await tournament.autocomplete!({
        name: 'name',
        value: '  ',
        api: fakeApi({ tournaments: { list } }),
      })
    ).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });
});
