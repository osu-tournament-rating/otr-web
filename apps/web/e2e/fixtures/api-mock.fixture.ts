import { test as base, Route } from '@playwright/test';

type OrpcRequest = {
  path: string[];
  input: unknown;
};

export type RouteHandler = {
  path: string;
  response: unknown;
  status?: number;
};

type ApiMockFixtures = {
  mockOrpc: (handlers: RouteHandler[]) => Promise<void>;
  mockOrpcProcedure: (
    path: string,
    response: unknown,
    status?: number
  ) => Promise<void>;
};

export const test = base.extend<ApiMockFixtures>({
  mockOrpc: async ({ page }, use) => {
    const setupMocks = async (handlers: RouteHandler[]) => {
      await page.route('**/rpc/**', async (route: Route) => {
        const request = route.request();

        try {
          const postData = request.postDataJSON() as OrpcRequest;
          const procedurePath = postData.path.join('.');

          const handler = handlers.find((h) => h.path === procedurePath);

          if (handler) {
            await route.fulfill({
              status: handler.status ?? 200,
              contentType: 'application/json',
              body: JSON.stringify(handler.response),
            });
          } else {
            await route.continue();
          }
        } catch {
          await route.continue();
        }
      });
    };
    await use(setupMocks);
  },

  mockOrpcProcedure: async ({ page }, use) => {
    const mockProcedure = async (
      path: string,
      response: unknown,
      status = 200
    ) => {
      await page.route('**/rpc/**', async (route: Route) => {
        const request = route.request();

        try {
          const postData = request.postDataJSON() as OrpcRequest;
          const procedurePath = postData.path.join('.');

          if (procedurePath === path) {
            await route.fulfill({
              status,
              contentType: 'application/json',
              body: JSON.stringify(response),
            });
          } else {
            await route.continue();
          }
        } catch {
          await route.continue();
        }
      });
    };
    await use(mockProcedure);
  },
});

export { expect } from '@playwright/test';
