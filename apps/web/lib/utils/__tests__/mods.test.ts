import { describe, expect, it } from 'bun:test';

import { Mods } from '@otr/core/osu';
import {
  deriveGameIsFreeMod,
  mostCommonDisplayMods,
  resolveGameDisplayMods,
  resolveGameModsFromScores,
} from '../mods';

describe('resolveGameDisplayMods', () => {
  it('uses the game mods when the game is not freemod', () => {
    expect(
      resolveGameDisplayMods({ isFreeMod: false, mods: Mods.HardRock }, [
        { mods: Mods.None },
      ])
    ).toEqual({ mods: Mods.HardRock, freemod: false });
  });

  it('reports the shared score combo for a uniform freemod game', () => {
    // The reported bug: freemod game records NoMod, every player used HD.
    expect(
      resolveGameDisplayMods({ isFreeMod: true, mods: Mods.None }, [
        { mods: Mods.Hidden },
        { mods: Mods.Hidden | Mods.NoFail },
      ])
    ).toEqual({ mods: Mods.Hidden, freemod: false });
  });

  it('falls back to FM when freemod combinations genuinely differ', () => {
    expect(
      resolveGameDisplayMods({ isFreeMod: true, mods: Mods.None }, [
        { mods: Mods.Hidden },
        { mods: Mods.HardRock },
      ])
    ).toEqual({ mods: Mods.None, freemod: true });
  });

  it('keeps the FM icon for a freemod game with no scores', () => {
    expect(
      resolveGameDisplayMods({ isFreeMod: true, mods: Mods.None }, [])
    ).toEqual({ mods: Mods.None, freemod: true });
  });
});

describe('deriveGameIsFreeMod', () => {
  it('is freemod when scores vary from a NoMod game', () => {
    expect(deriveGameIsFreeMod(Mods.None, [{ mods: Mods.Hidden }])).toBe(true);
  });

  it('is not freemod when a NoMod game only has NoMod/NoFail scores', () => {
    expect(
      deriveGameIsFreeMod(Mods.None, [
        { mods: Mods.None },
        { mods: Mods.NoFail },
      ])
    ).toBe(false);
  });

  it('is freemod when the game carries the freemod-allowed flag', () => {
    expect(deriveGameIsFreeMod(Mods.FreeModAllowed, [])).toBe(true);
  });

  it('is not freemod for a forced-mod game', () => {
    expect(deriveGameIsFreeMod(Mods.HardRock, [{ mods: Mods.HardRock }])).toBe(
      false
    );
  });
});

describe('resolveGameModsFromScores', () => {
  it('resolves HD for a NoMod freemod game where everyone played HD', () => {
    expect(
      resolveGameModsFromScores(Mods.None, [
        Mods.Hidden,
        Mods.Hidden | Mods.NoFail,
      ])
    ).toEqual({ mods: Mods.Hidden, freemod: false });
  });

  it('trusts forced game mods even with empty scores', () => {
    expect(resolveGameModsFromScores(Mods.HardRock, [])).toEqual({
      mods: Mods.HardRock,
      freemod: false,
    });
  });
});

describe('mostCommonDisplayMods', () => {
  it('returns NoMod for no games', () => {
    expect(mostCommonDisplayMods([])).toEqual({
      mods: Mods.None,
      freemod: false,
    });
  });

  it('reports HD across freemod games that all played HD', () => {
    expect(
      mostCommonDisplayMods([
        { mods: Mods.None, scoreMods: [Mods.Hidden, Mods.Hidden] },
        { mods: Mods.None, scoreMods: [Mods.Hidden] },
        {
          mods: Mods.None,
          scoreMods: [Mods.Hidden, Mods.Hidden | Mods.NoFail],
        },
      ])
    ).toEqual({ mods: Mods.Hidden, freemod: false });
  });

  it('picks the most frequent effective mod across games', () => {
    expect(
      mostCommonDisplayMods([
        { mods: Mods.HardRock, scoreMods: [] },
        { mods: Mods.HardRock, scoreMods: [] },
        { mods: Mods.None, scoreMods: [Mods.Hidden] },
      ])
    ).toEqual({ mods: Mods.HardRock, freemod: false });
  });
});
