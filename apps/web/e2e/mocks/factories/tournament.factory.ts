import type { TournamentListItem } from '@/lib/orpc/schema/tournament';
import { mockTournamentListItem, mockTournamentList } from '../data/tournaments.mock';

type TournamentOverrides = Partial<TournamentListItem>;

export function createTournament(overrides: TournamentOverrides = {}): TournamentListItem {
  return {
    ...mockTournamentListItem,
    ...overrides,
  };
}

export function createTournamentList(count: number): TournamentListItem[] {
  const tournaments: TournamentListItem[] = [];

  for (let i = 0; i < count; i++) {
    const month = (i % 12) + 1;
    const monthStr = month.toString().padStart(2, '0');
    tournaments.push(
      createTournament({
        id: i + 1,
        name: `Tournament ${i + 1}`,
        abbreviation: `T${i + 1}`,
        ruleset: i % 4,
        startTime: `2024-${monthStr}-01T00:00:00.000Z`,
        endTime: `2024-${monthStr}-15T00:00:00.000Z`,
      })
    );
  }

  return tournaments;
}

export function createEmptyTournamentList(): TournamentListItem[] {
  return [];
}

export { mockTournamentList };
