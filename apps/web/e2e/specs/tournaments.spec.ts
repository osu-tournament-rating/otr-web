import { test, expect } from '../fixtures/base.fixture';
import { createTournamentList, createEmptyTournamentList } from '../mocks/factories/tournament.factory';

test.describe('Tournaments Page', () => {
  test.beforeEach(async ({ mockOrpc }) => {
    await mockOrpc([
      {
        path: 'tournaments.list',
        response: createTournamentList(5),
      },
    ]);
  });

  test('displays page title', async ({ tournamentsPage }) => {
    await tournamentsPage.goto();

    await expect(tournamentsPage.pageTitle).toBeVisible();
  });

  test('displays tournament list', async ({ tournamentsPage }) => {
    await tournamentsPage.goto();

    await tournamentsPage.expectTournamentVisible('Tournament 1');
    await tournamentsPage.expectTournamentVisible('Tournament 2');
  });
});

test.describe('Tournaments Page - Empty State', () => {
  test('displays empty state when no tournaments', async ({
    tournamentsPage,
    mockOrpc,
  }) => {
    await mockOrpc([
      {
        path: 'tournaments.list',
        response: createEmptyTournamentList(),
      },
    ]);

    await tournamentsPage.goto();

    await expect(tournamentsPage.pageTitle).toBeVisible();
  });
});

test.describe('Tournaments Page - Filters', () => {
  test('navigates with ruleset filter', async ({ tournamentsPage, page, mockOrpc }) => {
    await mockOrpc([
      {
        path: 'tournaments.list',
        response: createTournamentList(3),
      },
    ]);

    await tournamentsPage.gotoWithFilters({ ruleset: '0' });

    await expect(page).toHaveURL(/ruleset=0/);
    await expect(tournamentsPage.pageTitle).toBeVisible();
  });
});
