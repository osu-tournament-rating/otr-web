import { router } from '@/app/server/oRPC/router';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { RouterClient } from '@orpc/server';

const link = new RPCLink({
  url: `${
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_BASE_URL
  }/rpc`,
  headers: async () => {
    if (typeof window !== 'undefined') {
      return {};
    }

    const { headers } = await import('next/headers');
    return await headers();
  },
});

export const orpc: RouterClient<typeof router> = createORPCClient(link);
