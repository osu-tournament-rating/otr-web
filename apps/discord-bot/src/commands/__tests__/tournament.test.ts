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
      pageSize: 1,
    });
    expect(get).toHaveBeenCalledWith({ id: 512 });
  });

  test('free text trusts the API order and opens a rejected first hit', async () => {
    const rejected = {
      ...tournamentList[0],
      id: 900,
      name: 'Oscillating Wincon Clash',
      abbreviation: 'OWC',
      verificationStatus: VerificationStatus.Rejected,
    };
    const get = procedure(tournamentDetail);
    await tournament.execute({
      options: options('OWC'),
      api: fakeApi({
        tournaments: {
          list: procedure([rejected, tournamentList[1]]),
          get,
        },
      }),
      ctx,
    });
    expect(get).toHaveBeenCalledWith({ id: 900 });
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
