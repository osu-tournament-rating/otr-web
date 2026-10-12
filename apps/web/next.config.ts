import type { NextConfig } from 'next';
import { join } from 'path';

import { loadRootEnv } from '../../lib/env/load-root-env';
import { LEGACY_OAUTH_CALLBACK_PATH } from './lib/auth/osu-callback';

loadRootEnv();

const nextConfig: NextConfig = {
  // The repository keeps its own agent guidance; stop `next dev` from writing
  // an untracked apps/web/AGENTS.md.
  agentRules: false,
  async redirects() {
    return [
      {
        // osu! returns here; better-auth handles the callback at the new path.
        source: `${LEGACY_OAUTH_CALLBACK_PATH}/:providerId`,
        destination: '/api/auth/callback/:providerId',
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ppy.sh',
      },
    ],
  },
  turbopack: {
    // The monorepo root. Without it, Next.js guesses from lockfiles, and a
    // worktree nested inside another checkout resolves to the outer one.
    root: join(__dirname, '../..'),
    rules: {
      '*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        removeViewBox: false,
                      },
                    },
                  },
                  {
                    name: 'removeAttrs',
                    params: { attrs: '(fill|stroke)' },
                  },
                ],
              },
            },
          },
        ],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
