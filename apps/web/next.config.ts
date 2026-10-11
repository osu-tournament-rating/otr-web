import type { NextConfig } from 'next';
import { join } from 'path';

import { loadRootEnv } from '../../lib/env/load-root-env';

loadRootEnv();

const nextConfig: NextConfig = {
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
